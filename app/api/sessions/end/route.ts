import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { syncTradesForSession } from "@/lib/sync-session-trades";

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabase
      .from("sessions")
      .select("id, started_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 });

    const endedAt = new Date();

    await supabase
      .from("sessions")
      .update({ ended_at: endedAt.toISOString() })
      .eq("id", session.id);

    // Get start choice from the session_start trigger
    const { data: startTrigger } = await supabase
      .from("triggers")
      .select("choice")
      .eq("session_id", session.id)
      .eq("trigger_type", "session_start")
      .limit(1)
      .maybeSingle();

    const startChoice = startTrigger?.choice ?? "clean";

    // Final sync — best-effort, max 5s
    const syncResult = await Promise.race([
      syncTradesForSession(supabase, session.id, user.id),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    // Compute stats from DB (handles both sync success and timeout gracefully)
    const { data: tradesRaw } = await supabase
      .from("trades")
      .select("pnl_usd, symbol, side, exit_time")
      .eq("session_id", session.id)
      .eq("is_closed", true);

    const trades = tradesRaw ?? [];
    const count = trades.length;
    const pnlUsd = Math.round(trades.reduce((s, t) => s + (t.pnl_usd ?? 0), 0) * 100) / 100;
    const winners = trades.filter((t) => (t.pnl_usd ?? 0) > 0).length;
    const winRate = count > 0 ? Math.round((winners / count) * 100) : 0;

    const winPnls = trades.filter((t) => (t.pnl_usd ?? 0) > 0).map((t) => t.pnl_usd ?? 0);
    const lossPnls = trades.filter((t) => (t.pnl_usd ?? 0) < 0).map((t) => t.pnl_usd ?? 0);
    const largestWin = winPnls.length > 0 ? Math.round(Math.max(...winPnls) * 100) / 100 : 0;
    const largestLoss = lossPnls.length > 0 ? Math.round(Math.min(...lossPnls) * 100) / 100 : 0;

    const durationSeconds = Math.floor(
      (endedAt.getTime() - new Date(session.started_at).getTime()) / 1000
    );

    let insightKey: "profitable" | "losing" | "empty";
    if (count === 0) insightKey = "empty";
    else if (pnlUsd >= 0) insightKey = "profitable";
    else insightKey = "losing";

    // Void the unused syncResult warning
    void syncResult;

    return NextResponse.json({
      durationSeconds,
      startChoice,
      count,
      pnlUsd,
      winRate,
      largestWin,
      largestLoss,
      insightKey,
    });
  } catch (err) {
    console.error("[sessions/end] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
