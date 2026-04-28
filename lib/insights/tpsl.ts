import { Trade } from "../trade-reconstruction";

export interface TPSLInsight {
  avgWinnerExitPct: number; // avg % gain at exit for winners (positive, e.g. 0.012 = +1.2%)
  avgLoserExitPct: number;  // avg % loss at exit for losers  (positive, e.g. 0.028 = −2.8%)
  winnerCount: number;
  loserCount: number;
  // ratio > 1 → losers are cut later than winners are taken (inverted discipline)
  ratio: number;
  isInverted: boolean; // avgLoserExitPct > avgWinnerExitPct
}

function exitPct(trade: Trade): number {
  if (trade.avgEntryPx === 0) return 0;
  if (trade.side === "long") {
    return (trade.avgExitPx - trade.avgEntryPx) / trade.avgEntryPx;
  }
  return (trade.avgEntryPx - trade.avgExitPx) / trade.avgEntryPx;
}

export function computeTPSLInsight(trades: Trade[]): TPSLInsight {
  const winners = trades.filter((t) => t.pnlNet > 0);
  const losers = trades.filter((t) => t.pnlNet <= 0);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const avgWinnerExitPct = avg(winners.map(exitPct));
  // losers exit at a negative pct — store as a positive magnitude
  const avgLoserExitPct = Math.abs(avg(losers.map(exitPct)));

  const ratio =
    avgWinnerExitPct > 0 ? avgLoserExitPct / avgWinnerExitPct : 0;

  return {
    avgWinnerExitPct,
    avgLoserExitPct,
    winnerCount: winners.length,
    loserCount: losers.length,
    ratio,
    isInverted: avgLoserExitPct > avgWinnerExitPct,
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

function mk(side: "long" | "short", entry: number, exit: number, pnlNet: number, i: number): Trade {
  return {
    coin: "BTC", side,
    openAt: new Date(i * 1000), closeAt: new Date(i * 1000 + 500),
    durationSeconds: 0, avgEntryPx: entry, avgExitPx: exit,
    size: 1, notional: entry, realizedPnl: pnlNet, feesTotal: 0,
    pnlNet, isWinner: pnlNet > 0, numFills: 1, fills: [],
  };
}

function testLongGoodDiscipline(): void {
  // Winners exit at +2%, losers exit at −1% → not inverted (good discipline)
  const trades = [
    mk("long", 100, 102, 2, 1),  // +2%
    mk("long", 100,  99, -1, 2), // −1%
  ];
  const r = computeTPSLInsight(trades);
  assert(near(r.avgWinnerExitPct, 0.02), `avgWinner=${r.avgWinnerExitPct}`);
  assert(near(r.avgLoserExitPct, 0.01), `avgLoser=${r.avgLoserExitPct}`);
  assert(r.isInverted === false, "should not be inverted");
  assert(near(r.ratio, 0.5), `ratio=${r.ratio}`);
  console.log("PASS: long good discipline");
}

function testShortInverted(): void {
  // Short: open at 100
  // Winner: exit at 95 → (100−95)/100 = +5%
  // Loser:  exit at 108 → (100−108)/100 = −8% magnitude 8%
  // 8% > 5% → inverted
  const trades = [
    mk("short", 100, 95, 5, 1),   // winner +5%
    mk("short", 100, 108, -8, 2), // loser  −8%
  ];
  const r = computeTPSLInsight(trades);
  assert(near(r.avgWinnerExitPct, 0.05), `avgWinner=${r.avgWinnerExitPct}`);
  assert(near(r.avgLoserExitPct, 0.08), `avgLoser=${r.avgLoserExitPct}`);
  assert(r.isInverted === true, "should be inverted");
  console.log("PASS: short inverted discipline");
}

function testEmpty(): void {
  const r = computeTPSLInsight([]);
  assert(r.avgWinnerExitPct === 0, "empty winner");
  assert(r.avgLoserExitPct === 0, "empty loser");
  assert(r.isInverted === false, "empty not inverted");
  console.log("PASS: empty");
}

export function runTPSLTests(): void {
  testLongGoodDiscipline();
  testShortInverted();
  testEmpty();
  console.log("\nAll TP/SL tests passed.");
}
