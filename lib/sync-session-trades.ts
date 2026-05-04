import { fetchUserFills, reconstructTrades } from "./trade-reconstruction";
import { HLRateLimitError } from "./hl-fetch";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TradeStats = {
  count: number;
  pnlUsd: number;
  winRate: number;
  largestWin: number;
  largestLoss: number;
  lastTrade: {
    symbol: string;
    side: string;
    pnlUsd: number;
    closedAt: string;
  } | null;
};

export type SyncResult =
  | { ok: true; stats: TradeStats }
  | { ok: false; rateLimited: true }
  | { ok: false; rateLimited: false; error: string };

export async function syncTradesForSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sessionId: string,
  userId: string
): Promise<SyncResult> {
  // 1. Get user's wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();

  if (!wallet) return { ok: false, rateLimited: false, error: "no_wallet" };

  // 2. Get session time window
  const { data: session } = await supabase
    .from("sessions")
    .select("started_at, ended_at")
    .eq("id", sessionId)
    .single();

  if (!session) return { ok: false, rateLimited: false, error: "no_session" };

  const startTime = new Date(session.started_at);
  const endTime = session.ended_at ? new Date(session.ended_at) : new Date();

  // 3. Fetch fills from Hyperliquid for the session window
  let fills;
  try {
    fills = await fetchUserFills(wallet.address, startTime, endTime);
  } catch (e) {
    if (e instanceof HLRateLimitError) return { ok: false, rateLimited: true };
    console.error("[sync] HL fetch error:", e);
    return { ok: false, rateLimited: false, error: "fetch_failed" };
  }

  // 4. Reconstruct closed trades with FIFO
  // emitAfter = startTime filters out any pre-window orphan closes
  const trades = reconstructTrades(fills, startTime);

  // DEBUG — remove after confirming user_id flow
  console.log("[SYNC DEBUG] userId:", userId);
  console.log("[SYNC DEBUG] sessionId:", sessionId);
  console.log("[SYNC DEBUG] wallet.address:", wallet.address);
  console.log("[SYNC DEBUG] trades reconstructed:", trades.length);

  // 5. Delete existing trades for this session then upsert fresh (idempotent).
  //    DELETE first avoids stale rows when the reconstruction changes between polls.
  //    UPSERT with ON CONFLICT handles any race between concurrent sync calls.
  const { error: deleteError } = await supabase
    .from("trades")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[sync] DELETE trades failed:", deleteError.code, deleteError.message);
    return { ok: false, rateLimited: false, error: `delete_failed: ${deleteError.message}` };
  }

  if (trades.length > 0) {
    const rows = trades.map((t) => ({
      user_id: userId,
      session_id: sessionId,
      wallet_address: wallet.address,
      coin: t.coin,
      side: t.side,
      size: t.size,
      avg_entry_px: t.avgEntryPx,
      avg_exit_px: t.avgExitPx,
      open_at: t.openAt.toISOString(),
      close_at: t.closeAt.toISOString(),
      duration_seconds: t.durationSeconds,
      notional: t.notional,
      realized_pnl: t.realizedPnl,
      fees_total: t.feesTotal,
      pnl_net: t.pnlNet,
      is_winner: t.isWinner,
      num_fills: t.numFills,
    }));

    console.log("[SYNC DEBUG] rows[0].user_id:", rows[0]?.user_id);
    console.log("[SYNC DEBUG] rows[0].session_id:", rows[0]?.session_id);
    console.log("[SYNC DEBUG] rows[0].coin:", rows[0]?.coin);
    console.log("[SYNC DEBUG] rows[0].open_at:", rows[0]?.open_at);

    const { error: upsertError } = await supabase
      .from("trades")
      .upsert(rows, { onConflict: "user_id,coin,open_at,side" });

    if (upsertError) {
      console.error("[sync] UPSERT trades failed:", upsertError.code, upsertError.message);
      return { ok: false, rateLimited: false, error: `upsert_failed: ${upsertError.message}` };
    }
  }

  return { ok: true, stats: computeStats(trades) };
}

function computeStats(trades: ReturnType<typeof reconstructTrades>): TradeStats {
  if (trades.length === 0) {
    return { count: 0, pnlUsd: 0, winRate: 0, largestWin: 0, largestLoss: 0, lastTrade: null };
  }

  const pnlUsd = trades.reduce((sum, t) => sum + t.pnlNet, 0);
  const winners = trades.filter((t) => t.isWinner).length;
  const winRate = Math.round((winners / trades.length) * 100);

  const winPnls = trades.filter((t) => t.pnlNet > 0).map((t) => t.pnlNet);
  const lossPnls = trades.filter((t) => t.pnlNet < 0).map((t) => t.pnlNet);
  const largestWin = winPnls.length > 0 ? Math.max(...winPnls) : 0;
  const largestLoss = lossPnls.length > 0 ? Math.min(...lossPnls) : 0;

  const last = [...trades].sort((a, b) => b.closeAt.getTime() - a.closeAt.getTime())[0];

  return {
    count: trades.length,
    pnlUsd: Math.round(pnlUsd * 100) / 100,
    winRate,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    lastTrade: {
      symbol: last.coin,
      side: last.side,
      pnlUsd: Math.round(last.pnlNet * 100) / 100,
      closedAt: last.closeAt.toISOString(),
    },
  };
}
