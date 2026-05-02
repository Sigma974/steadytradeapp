import { supabase } from "@/lib/supabase";
import { getTraderData } from "@/lib/get-trader-data";
import { calculateSteadyScore } from "@/lib/insights/steadyScore";
import { calculateVerdict } from "@/lib/insights/verdict";

const MIN_TRADES = 30;
const MIN_NOTIONAL = 1000;
const DAYS_BACK = 30;

export type SnapshotResult =
  | { status: "ok"; score: number }
  | { status: "filtered"; reason: string }
  | { status: "error"; reason: string };

/**
 * Compute and upsert a leaderboard snapshot for a single wallet,
 * then re-run the ranking pass for today's date.
 * Used by the /api/leaderboard/submit endpoint for immediate feedback.
 */
export async function snapshotSingleWallet(address: string): Promise<SnapshotResult> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const data = await getTraderData(address, DAYS_BACK);
    const totalNotional = data.trades.reduce((s, t) => s + t.notional, 0);
    const { totalTrades, totalPnl, winRate } = data.insights.general;

    if (totalTrades < MIN_TRADES || totalNotional < MIN_NOTIONAL) {
      return {
        status: "filtered",
        reason: `trades=${totalTrades}, notional=${totalNotional.toFixed(0)}`,
      };
    }

    const scoreResult = calculateSteadyScore(data);
    if (!scoreResult) {
      return { status: "filtered", reason: "score could not be computed" };
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
          rank: null,
        },
        { onConflict: "wallet_address,snapshot_date" }
      );

    if (upsertErr) throw new Error(upsertErr.message);

    // Re-run ranking pass for today so the new wallet gets a rank
    const { data: snapshots } = await supabase
      .from("leaderboard_snapshots")
      .select("id")
      .eq("snapshot_date", today)
      .order("steady_score", { ascending: false });

    if (snapshots) {
      for (let rank = 1; rank <= snapshots.length; rank++) {
        await supabase
          .from("leaderboard_snapshots")
          .update({ rank })
          .eq("id", snapshots[rank - 1].id);
      }
    }

    return { status: "ok", score: scoreResult.score };
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
