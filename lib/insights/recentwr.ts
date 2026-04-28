import { Trade } from "../trade-reconstruction";

export interface RecentWinRateInsight {
  recentDays: number;        // window used (30)
  recentCount: number;       // trades in recent window
  recentWinRate: number;     // win rate in recent window
  totalCount: number;        // all trades in dataset
  totalWinRate: number;      // overall win rate
  delta: number;             // recentWinRate − totalWinRate
  trend: "improving" | "declining" | "stable";
  hasEnoughHistory: boolean; // recent window covers < 80% of all trades (otherwise comparison is meaningless)
}

export function computeRecentWinRate(
  trades: Trade[],
  recentDays = 30
): RecentWinRateInsight {
  const empty: RecentWinRateInsight = {
    recentDays,
    recentCount: 0,
    recentWinRate: 0,
    totalCount: 0,
    totalWinRate: 0,
    delta: 0,
    trend: "stable",
    hasEnoughHistory: false,
  };

  if (trades.length === 0) return empty;

  const cutoff = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
  const recent = trades.filter((t) => t.closeAt >= cutoff);

  const winRate = (arr: Trade[]) =>
    arr.length ? arr.filter((t) => t.pnlNet > 0).length / arr.length : 0;

  const totalWinRate = winRate(trades);
  const recentWinRate = winRate(recent);
  const delta = recentWinRate - totalWinRate;

  // Meaningful only when recent covers < 80% of the full dataset
  const hasEnoughHistory = recent.length < trades.length * 0.8;

  let trend: "improving" | "declining" | "stable" = "stable";
  if (hasEnoughHistory && Math.abs(delta) >= 0.05) {
    trend = delta > 0 ? "improving" : "declining";
  }

  return {
    recentDays,
    recentCount: recent.length,
    recentWinRate,
    totalCount: trades.length,
    totalWinRate,
    delta,
    trend,
    hasEnoughHistory,
  };
}

// ---------------------------------------------------------------------------
// Self-tests
// ---------------------------------------------------------------------------

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function near(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) < tol;
}

function mk(pnlNet: number, daysAgo: number): Trade {
  const closeAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    coin: "BTC", side: "long",
    openAt: new Date(closeAt.getTime() - 1000),
    closeAt,
    durationSeconds: 1, avgEntryPx: 100, avgExitPx: 110,
    size: 1, notional: 100, realizedPnl: pnlNet, feesTotal: 0,
    pnlNet, isWinner: pnlNet > 0, numFills: 1, fills: [],
  };
}

function testDeclining(): void {
  // Older trades (45–90 days ago): 4W 1L = 80% WR
  // Recent trades (0–29 days ago): 1W 4L = 20% WR
  // Total = 5W 5L = 50% WR
  // delta = 20% − 50% = −30% → declining
  const trades = [
    mk(10, 60), mk(10, 55), mk(10, 50), mk(10, 45), mk(-5, 40), // older high WR
    mk(5, 20), mk(-3, 15), mk(-4, 10), mk(-2, 5), mk(-1, 1),    // recent low WR
  ];
  const r = computeRecentWinRate(trades, 30);
  assert(r.recentCount === 5, `recentCount=${r.recentCount}`);
  assert(r.totalCount === 10, `totalCount=${r.totalCount}`);
  assert(near(r.recentWinRate, 0.2), `recentWR=${r.recentWinRate}`);
  assert(near(r.totalWinRate, 0.5), `totalWR=${r.totalWinRate}`);
  assert(r.trend === "declining", `trend=${r.trend}`);
  assert(r.hasEnoughHistory === true, "hasEnoughHistory");
  console.log("PASS: declining trend");
}

function testImproving(): void {
  // Older: 1W 4L = 20%. Recent: 4W 1L = 80%. delta = +60% → improving
  const trades = [
    mk(-1, 60), mk(-2, 55), mk(-3, 50), mk(-4, 45), mk(5, 40),
    mk(10, 20), mk(8, 15), mk(6, 10), mk(4, 5), mk(-1, 1),
  ];
  const r = computeRecentWinRate(trades, 30);
  assert(r.trend === "improving", `trend=${r.trend}`);
  console.log("PASS: improving trend");
}

function testNoHistory(): void {
  // All trades within 30 days → not enough history for comparison
  const trades = [mk(5, 5), mk(-3, 10), mk(8, 20)];
  const r = computeRecentWinRate(trades, 30);
  assert(r.hasEnoughHistory === false, "should not have enough history");
  assert(r.trend === "stable", "trend stable when no history");
  console.log("PASS: no history");
}

function testEmpty(): void {
  const r = computeRecentWinRate([], 30);
  assert(r.totalCount === 0, "empty");
  console.log("PASS: empty");
}

export function runRecentWRTests(): void {
  testDeclining();
  testImproving();
  testNoHistory();
  testEmpty();
  console.log("\nAll recent WR tests passed.");
}
