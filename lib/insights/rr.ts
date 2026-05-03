import { Trade } from "../trade-reconstruction";

export interface RRInsight {
  avgWinnerPnl: number;
  avgLoserPnl: number;
  realizedRR: number | null; // null when no losing trades (non-calculable)
  requiredRR: number;        // (1 − winRate) / winRate — breakeven at current WR
  winRate: number;
  winnerCount: number;
  loserCount: number;
  isAboveBreakeven: boolean; // realizedRR >= requiredRR
}

export function computeRRInsight(trades: Trade[]): RRInsight {
  const winners = trades.filter((t) => t.pnlNet > 0);
  const losers = trades.filter((t) => t.pnlNet <= 0);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const avgWinnerPnl = avg(winners.map((t) => t.pnlNet));
  const avgLoserPnl = Math.abs(avg(losers.map((t) => t.pnlNet)));
  const winRate = trades.length > 0 ? winners.length / trades.length : 0;

  const realizedRR = avgLoserPnl > 0 ? avgWinnerPnl / avgLoserPnl : null;
  // Breakeven: winRate × win = (1 − winRate) × loss  ⟹  win/loss = (1−WR)/WR
  const requiredRR = winRate > 0 && winRate < 1 ? (1 - winRate) / winRate : 0;

  return {
    avgWinnerPnl,
    avgLoserPnl,
    realizedRR,
    requiredRR,
    winRate,
    winnerCount: winners.length,
    loserCount: losers.length,
    isAboveBreakeven: realizedRR != null && realizedRR >= requiredRR && requiredRR > 0,
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

function mk(pnlNet: number, i: number): Trade {
  return {
    coin: "BTC", side: "long",
    openAt: new Date(i * 1000), closeAt: new Date(i * 1000 + 500),
    durationSeconds: 0, avgEntryPx: 100, avgExitPx: 110,
    size: 1, notional: 100, realizedPnl: pnlNet, feesTotal: 0,
    pnlNet, isWinner: pnlNet > 0, numFills: 1, fills: [],
  };
}

function testBasic(): void {
  // 2 winners (+10, +20) → avg +15
  // 2 losers  (−5, −15) → avg −10
  // RR = 15 / 10 = 1.5
  // WR = 50% → requiredRR = 0.5/0.5 = 1.0
  // isAboveBreakeven = 1.5 >= 1.0 = true
  const trades = [mk(10, 1), mk(20, 2), mk(-5, 3), mk(-15, 4)];
  const r = computeRRInsight(trades);
  assert(near(r.avgWinnerPnl, 15), `avgWinnerPnl=${r.avgWinnerPnl}`);
  assert(near(r.avgLoserPnl, 10), `avgLoserPnl=${r.avgLoserPnl}`);
  assert(near(r.realizedRR!, 1.5), `realizedRR=${r.realizedRR}`);
  assert(near(r.requiredRR, 1.0), `requiredRR=${r.requiredRR}`);
  assert(r.isAboveBreakeven === true, "should be above breakeven");
  console.log("PASS: basic RR");
}

function testBelowBreakeven(): void {
  // WR = 33% → requiredRR = 0.67/0.33 ≈ 2.0
  // Realized: avg win=5, avg loss=5 → RR=1.0 < 2.0 → below breakeven
  const trades = [mk(5, 1), mk(-5, 2), mk(-5, 3)];
  const r = computeRRInsight(trades);
  assert(near(r.winRate, 1 / 3), `winRate=${r.winRate}`);
  assert(near(r.realizedRR!, 1.0), `realizedRR=${r.realizedRR}`);
  assert(r.isAboveBreakeven === false, "should be below breakeven");
  console.log("PASS: below breakeven");
}

function testAllWinners(): void {
  const trades = [mk(10, 1), mk(20, 2)];
  const r = computeRRInsight(trades);
  assert(r.loserCount === 0, "no losers");
  assert(r.realizedRR === null, "RR=null with no losers");
  console.log("PASS: all winners");
}

function testEmpty(): void {
  const r = computeRRInsight([]);
  assert(r.realizedRR === null, "empty → RR=null");
  assert(r.requiredRR === 0, "empty → required=0");
  console.log("PASS: empty");
}

export function runRRTests(): void {
  testBasic();
  testBelowBreakeven();
  testAllWinners();
  testEmpty();
  console.log("\nAll RR tests passed.");
}
