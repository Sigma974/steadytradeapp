import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTraderData } from "@/lib/get-trader-data";
import { calculateSteadyScore } from "@/lib/insights/steadyScore";
import { calculateVerdict } from "@/lib/insights/verdict";

// Request max runtime on Vercel (Pro plan: up to 300s)
export const maxDuration = 300;

const MIN_TRADES = 30;
const MIN_NOTIONAL = 1000;
const DAYS_BACK = 30;
// Pause between wallets to avoid hammering the Hyperliquid API
const INTER_WALLET_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WalletResult =
  | { address: string; status: "ok"; score: number }
  | { address: string; status: "filtered"; reason: string }
  | { address: string; status: "error"; reason: string };

export async function GET(req: NextRequest): Promise<Response> {
  // Verify Vercel Cron secret — also accepts manual runs with the same header
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Fetch active wallets ─────────────────────────────────────────────
  // ?addresses=0xabc,0xdef limits processing to those wallets (test / re-run)
  const addressFilter = req.nextUrl.searchParams
    .get("addresses")
    ?.split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  let query = supabase
    .from("leaderboard_wallets")
    .select("address")
    .eq("is_excluded", false);

  if (addressFilter?.length) {
    query = query.in("address", addressFilter);
  }

  const { data: wallets, error: walletsErr } = await query;

  if (walletsErr) {
    return Response.json({ error: walletsErr.message }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const results: WalletResult[] = [];

  // ── 2. Sync + compute + upsert each wallet ──────────────────────────────
  for (let i = 0; i < wallets.length; i++) {
    const { address } = wallets[i];

    if (i > 0) await sleep(INTER_WALLET_DELAY_MS);

    try {
      const data = await getTraderData(address, DAYS_BACK);

      const totalNotional = data.trades.reduce((s, t) => s + t.notional, 0);
      const { totalTrades, totalPnl, winRate } = data.insights.general;

      // Minimum activity filters
      if (totalTrades < MIN_TRADES || totalNotional < MIN_NOTIONAL) {
        results.push({
          address,
          status: "filtered",
          reason: `trades=${totalTrades}, notional=${totalNotional.toFixed(0)}`,
        });
        continue;
      }

      const scoreResult = calculateSteadyScore(data);
      if (!scoreResult) {
        results.push({ address, status: "filtered", reason: "score could not be computed" });
        continue;
      }

      const verdict = calculateVerdict(data, null);

      const { error: upsertErr } = await supabase
        .from("leaderboard_snapshots")
        .upsert(
          {
            wallet_address: address,
            snapshot_date: today,
            steady_score: scoreResult.score,
            verdict: verdict?.key ?? null,
            pnl_net: totalPnl,
            win_rate: winRate,
            trades_count: totalTrades,
            total_notional: totalNotional,
            rank: null, // set in the ranking pass below
          },
          { onConflict: "wallet_address,snapshot_date" }
        );

      if (upsertErr) throw new Error(upsertErr.message);

      results.push({ address, status: "ok", score: scoreResult.score });
    } catch (err) {
      results.push({
        address,
        status: "error",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 3. Ranking pass — assign rank by steady_score DESC ──────────────────
  const { data: snapshots, error: fetchErr } = await supabase
    .from("leaderboard_snapshots")
    .select("id")
    .eq("snapshot_date", today)
    .order("steady_score", { ascending: false });

  if (!fetchErr && snapshots) {
    for (let rank = 1; rank <= snapshots.length; rank++) {
      await supabase
        .from("leaderboard_snapshots")
        .update({ rank })
        .eq("id", snapshots[rank - 1].id);
    }
  }

  // ── 4. Return summary ────────────────────────────────────────────────────
  return Response.json({
    date: today,
    total: wallets.length,
    ranked: snapshots?.length ?? 0,
    ok: results.filter((r) => r.status === "ok").length,
    filtered: results.filter((r) => r.status === "filtered").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
