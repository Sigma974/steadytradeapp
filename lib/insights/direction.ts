import { Trade } from "../trade-reconstruction";

export interface DirectionStat {
  trades: number;
  winners: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface DirectionWinRateInsight {
  long: DirectionStat;
  short: DirectionStat;
  delta: number;                              // long.winRate − short.winRate
  dominantDirection: "long" | "short" | null; // better direction, or null if tie / not enough data
  significantDiff: boolean;                   // |delta| >= 0.10 and both sides have ≥ 5 trades
}

function statFor(trades: Trade[]): DirectionStat {
  if (trades.length === 0) {
    return { trades: 0, winners: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
  }
  const winners = trades.filter((t) => t.pnlNet > 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.pnlNet, 0);
  return {
    trades: trades.length,
    winners,
    winRate: winners / trades.length,
    totalPnl,
    avgPnl: totalPnl / trades.length,
  };
}

export function computeDirectionWinRate(trades: Trade[]): DirectionWinRateInsight {
  const longs = trades.filter((t) => t.side === "long");
  const shorts = trades.filter((t) => t.side === "short");

  const long = statFor(longs);
  const short = statFor(shorts);
  const delta = long.winRate - short.winRate;

  const significantDiff =
    Math.abs(delta) >= 0.1 && long.trades >= 5 && short.trades >= 5;

  let dominantDirection: "long" | "short" | null = null;
  if (significantDiff) {
    dominantDirection = delta > 0 ? "long" : "short";
  }

  return { long, short, delta, dominantDirection, significantDiff };
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

function mk(side: "long" | "short", pnlNet: number, i: number): Trade {
  return {
    coin: "BTC",
    side,
    openAt: new Date(i * 1000),
    closeAt: new Date(i * 1000 + 500),
    durationSeconds: 0,
    avgEntryPx: 100,
    avgExitPx: 110,
    size: 1,
    notional: 100,
    realizedPnl: pnlNet,
    feesTotal: 0,
    pnlNet,
    isWinner: pnlNet > 0,
    numFills: 1,
    fills: [],
  };
}

function testBasic(): void {
  const trades = [
    // 3W / 2L longs → 60% WR
    mk("long", 10, 1), mk("long", 5, 2), mk("long", 8, 3),
    mk("long", -3, 4), mk("long", -1, 5),
    // 1W / 4L shorts → 20% WR
    mk("short", 4, 6),
    mk("short", -2, 7), mk("short", -3, 8), mk("short", -1, 9), mk("short", -5, 10),
  ];
  const r = computeDirectionWinRate(trades);
  assert(r.long.trades === 5, `long.trades=${r.long.trades}`);
  assert(r.short.trades === 5, `short.trades=${r.short.trades}`);
  assert(near(r.long.winRate, 0.6), `long.winRate=${r.long.winRate}`);
  assert(near(r.short.winRate, 0.2), `short.winRate=${r.short.winRate}`);
  assert(near(r.delta, 0.4), `delta=${r.delta}`);
  assert(r.significantDiff === true, "significantDiff");
  assert(r.dominantDirection === "long", `dominant=${r.dominantDirection}`);
  console.log("PASS: basic direction WR");
}

function testNotSignificantSmallDiff(): void {
  // 55% long vs 50% short — below 10% threshold
  const trades = [
    mk("long", 1, 1), mk("long", 1, 2), mk("long", 1, 3), mk("long", 1, 4), mk("long", 1, 5),
    mk("long", -1, 6), mk("long", -1, 7), mk("long", -1, 8), mk("long", -1, 9),
    mk("short", 1, 10), mk("short", 1, 11), mk("short", 1, 12), mk("short", 1, 13), mk("short", 1, 14),
    mk("short", -1, 15), mk("short", -1, 16), mk("short", -1, 17), mk("short", -1, 18), mk("short", -1, 19),
  ];
  const r = computeDirectionWinRate(trades);
  assert(r.significantDiff === false, `expected no significant diff, got delta=${r.delta}`);
  assert(r.dominantDirection === null, "dominant should be null");
  console.log("PASS: not significant (small diff)");
}

function testNoShorts(): void {
  const trades = [mk("long", 5, 1), mk("long", -3, 2)];
  const r = computeDirectionWinRate(trades);
  assert(r.short.trades === 0, "no short trades");
  assert(r.significantDiff === false, "no diff when one side is empty");
  assert(r.dominantDirection === null, "no dominant");
  console.log("PASS: no shorts");
}

function testEmpty(): void {
  const r = computeDirectionWinRate([]);
  assert(r.long.trades === 0, "empty long");
  assert(r.short.trades === 0, "empty short");
  assert(r.significantDiff === false, "no diff");
  console.log("PASS: empty");
}

export function runDirectionTests(): void {
  testBasic();
  testNotSignificantSmallDiff();
  testNoShorts();
  testEmpty();
  console.log("\nAll direction WR tests passed.");
}
