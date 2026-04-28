import { Trade } from "../trade-reconstruction";

export interface StreakInsight {
  currentStreak: { type: "win" | "loss"; length: number } | null;
  longestWinStreak: { length: number; totalPnl: number } | null;
  longestLossStreak: { length: number; totalPnl: number } | null;
  postStreakWinRate: number;
  postStreakCount: number;
  baselineWinRate: number;
  significantStreakCount: number;
}

interface Run {
  type: "win" | "loss";
  length: number;
  totalPnl: number;
}

export function detectStreaks(trades: Trade[], minLength = 3): StreakInsight {
  if (trades.length === 0) {
    return {
      currentStreak: null,
      longestWinStreak: null,
      longestLossStreak: null,
      postStreakWinRate: 0,
      postStreakCount: 0,
      baselineWinRate: 0,
      significantStreakCount: 0,
    };
  }

  const sorted = [...trades].sort(
    (a, b) => a.closeAt.getTime() - b.closeAt.getTime()
  );

  const baselineWinRate =
    sorted.filter((t) => t.isWinner).length / sorted.length;

  // Compress trades into runs of consecutive same-outcome trades
  const runs: Run[] = [];
  for (const trade of sorted) {
    const type: "win" | "loss" = trade.isWinner ? "win" : "loss";
    if (runs.length === 0 || runs[runs.length - 1].type !== type) {
      runs.push({ type, length: 1, totalPnl: trade.pnlNet });
    } else {
      const cur = runs[runs.length - 1];
      cur.length++;
      cur.totalPnl += trade.pnlNet;
    }
  }

  // Walk runs: collect significant ones and their post-streak trade outcome.
  // We also track our position in the sorted array to find the first trade of
  // the next run (the "post-streak" trade).
  const significantRuns: Run[] = [];
  const postStreakWins: boolean[] = [];

  let cursor = 0;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.length >= minLength) {
      significantRuns.push(run);
      const nextStart = cursor + run.length;
      if (nextStart < sorted.length) {
        postStreakWins.push(sorted[nextStart].isWinner);
      }
    }
    cursor += run.length;
  }

  const longestWin =
    significantRuns
      .filter((r) => r.type === "win")
      .sort((a, b) => b.length - a.length)[0] ?? null;
  const longestLoss =
    significantRuns
      .filter((r) => r.type === "loss")
      .sort((a, b) => b.length - a.length)[0] ?? null;

  const lastRun = runs[runs.length - 1];
  const currentStreak = lastRun
    ? { type: lastRun.type, length: lastRun.length }
    : null;

  const postStreakCount = postStreakWins.length;
  const postStreakWinRate =
    postStreakCount > 0
      ? postStreakWins.filter(Boolean).length / postStreakCount
      : 0;

  return {
    currentStreak,
    longestWinStreak: longestWin
      ? { length: longestWin.length, totalPnl: longestWin.totalPnl }
      : null,
    longestLossStreak: longestLoss
      ? { length: longestLoss.length, totalPnl: longestLoss.totalPnl }
      : null,
    postStreakWinRate,
    postStreakCount,
    baselineWinRate,
    significantStreakCount: significantRuns.length,
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

function mk(pnlNet: number, closeMs: number): Trade {
  return {
    coin: "BTC",
    side: "long",
    openAt: new Date(closeMs - 1000),
    closeAt: new Date(closeMs),
    durationSeconds: 1,
    avgEntryPx: 100,
    avgExitPx: pnlNet > 0 ? 110 : 90,
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

function testBasicStreak(): void {
  // Sequence: W W W  L  W  L L L  W
  //           [win3] ^post  [los3] ^post
  // post-streak trades: L (after win streak) and W (after loss streak) → 1/2 = 50%
  const trades = [
    mk(10, 1000), mk(5, 2000), mk(8, 3000),  // win streak of 3
    mk(-3, 4000),                              // post-streak (L)
    mk(6, 5000),                              // single win
    mk(-2, 6000), mk(-4, 7000), mk(-1, 8000), // loss streak of 3
    mk(7, 9000),                              // post-streak (W)
  ];

  const r = detectStreaks(trades, 3);
  assert(r.significantStreakCount === 2, `significantStreakCount=${r.significantStreakCount}`);
  assert(r.longestWinStreak?.length === 3, `longestWin=${r.longestWinStreak?.length}`);
  assert(r.longestLossStreak?.length === 3, `longestLoss=${r.longestLossStreak?.length}`);
  assert(r.postStreakCount === 2, `postStreakCount=${r.postStreakCount}`);
  assert(near(r.postStreakWinRate, 0.5), `postStreakWinRate=${r.postStreakWinRate}`);
  assert(r.currentStreak?.type === "win", `currentStreak type`);
  assert(r.currentStreak?.length === 1, `currentStreak length`);
  console.log("PASS: basic streak detection");
}

function testNoSignificantStreak(): void {
  // Alternating W L W L — no run of 3+
  const trades = [mk(5, 1000), mk(-3, 2000), mk(4, 3000), mk(-2, 4000)];
  const r = detectStreaks(trades, 3);
  assert(r.significantStreakCount === 0, "no significant streaks");
  assert(r.longestWinStreak === null, "no win streak");
  assert(r.longestLossStreak === null, "no loss streak");
  assert(r.postStreakCount === 0, "no post-streak trades");
  console.log("PASS: no significant streak");
}

function testOngoingLossStreak(): void {
  // L L L L — all losses, ongoing streak; streak never ends so no post-streak trade
  const trades = [mk(-1, 1000), mk(-2, 2000), mk(-3, 3000), mk(-4, 4000)];
  const r = detectStreaks(trades, 3);
  assert(r.currentStreak?.type === "loss", "current streak type");
  assert(r.currentStreak?.length === 4, `current streak length=${r.currentStreak?.length}`);
  assert(r.postStreakCount === 0, "no post-streak trades (streak ongoing)");
  assert(r.significantStreakCount === 1, "one significant streak (the ongoing one)");
  assert(r.longestLossStreak?.length === 4, `longestLoss=${r.longestLossStreak?.length}`);
  console.log("PASS: ongoing loss streak");
}

function testPnlAccumulation(): void {
  // Win streak: +10 +20 +30 = +60 total
  const trades = [mk(10, 1000), mk(20, 2000), mk(30, 3000), mk(-5, 4000)];
  const r = detectStreaks(trades, 3);
  assert(r.longestWinStreak !== null, "win streak exists");
  assert(near(r.longestWinStreak!.totalPnl, 60), `totalPnl=${r.longestWinStreak!.totalPnl}`);
  console.log("PASS: pnl accumulation in streak");
}

function testEmpty(): void {
  const r = detectStreaks([], 3);
  assert(r.currentStreak === null, "no current streak");
  assert(r.longestWinStreak === null, "no win streak");
  assert(r.longestLossStreak === null, "no loss streak");
  assert(r.baselineWinRate === 0, "baseline 0");
  console.log("PASS: empty trades");
}

export function runStreakTests(): void {
  testBasicStreak();
  testNoSignificantStreak();
  testOngoingLossStreak();
  testPnlAccumulation();
  testEmpty();
  console.log("\nAll streak tests passed.");
}
