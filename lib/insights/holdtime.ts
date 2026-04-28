import { Trade } from "../trade-reconstruction";

export interface HoldTimeBucket {
  label: string;
  minSeconds: number;
  maxSeconds: number;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  expectancyR: number | null; // avgPnl / |avgLoserPnl|; null if no losers in bucket
  pctOfTrades: number;
}

export interface HoldTimeInsight {
  buckets: HoldTimeBucket[];       // non-empty only, sorted by minSeconds
  bestBucket: HoldTimeBucket | null;
  worstBucket: HoldTimeBucket | null;
  totalTrades: number;
}

const THRESHOLDS: Array<{ label: string; min: number; max: number }> = [
  { label: "<30min",   min: 0,      max: 1_800 },
  { label: "30min–2h", min: 1_800,  max: 7_200 },
  { label: "2h–8h",    min: 7_200,  max: 28_800 },
  { label: "8h–24h",   min: 28_800, max: 86_400 },
  { label: ">24h",     min: 86_400, max: Infinity },
];

export function computeHoldTimeEffect(trades: Trade[]): HoldTimeInsight {
  if (trades.length === 0) {
    return { buckets: [], bestBucket: null, worstBucket: null, totalTrades: 0 };
  }

  const buckets: HoldTimeBucket[] = [];

  for (const { label, min, max } of THRESHOLDS) {
    const group = trades.filter(
      (t) => t.durationSeconds >= min && t.durationSeconds < max
    );
    if (group.length === 0) continue;

    const winners = group.filter((t) => t.isWinner);
    const losers = group.filter((t) => !t.isWinner);
    const totalPnl = group.reduce((s, t) => s + t.pnlNet, 0);
    const avgPnl = totalPnl / group.length;

    const avgLoserPnl =
      losers.length > 0
        ? losers.reduce((s, t) => s + t.pnlNet, 0) / losers.length
        : null;

    const expectancyR =
      avgLoserPnl !== null && avgLoserPnl !== 0
        ? avgPnl / Math.abs(avgLoserPnl)
        : null;

    buckets.push({
      label,
      minSeconds: min,
      maxSeconds: max,
      count: group.length,
      winRate: winners.length / group.length,
      totalPnl,
      avgPnl,
      expectancyR,
      pctOfTrades: group.length / trades.length,
    });
  }

  const bestBucket =
    buckets.length > 0
      ? buckets.reduce((b, cur) => (cur.totalPnl > b.totalPnl ? cur : b))
      : null;
  const worstBucket =
    buckets.length > 0
      ? buckets.reduce((b, cur) => (cur.totalPnl < b.totalPnl ? cur : b))
      : null;

  return { buckets, bestBucket, worstBucket, totalTrades: trades.length };
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

function mk(durationSeconds: number, pnlNet: number): Trade {
  const open = new Date(1_000_000);
  return {
    coin: "BTC",
    side: "long",
    openAt: open,
    closeAt: new Date(open.getTime() + durationSeconds * 1000),
    durationSeconds,
    avgEntryPx: 100,
    avgExitPx: 100 + pnlNet,
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

function testBucketAssignment(): void {
  const trades = [
    mk(300, 10),    // 5min  → <30min
    mk(1799, -5),   // 29min → <30min
    mk(1800, 20),   // 30min → 30min-2h
    mk(7199, -3),   // 2h-1s → 30min-2h
    mk(7200, 15),   // 2h    → 2h-8h
    mk(86400, -12), // 24h   → >24h
  ];
  const r = computeHoldTimeEffect(trades);

  assert(r.buckets.length === 4, `buckets=${r.buckets.length}`);
  const b0 = r.buckets[0]; // <30min
  assert(b0.label === "<30min", `label=${b0.label}`);
  assert(b0.count === 2, `<30min count=${b0.count}`);
  assert(near(b0.totalPnl, 5), `<30min totalPnl=${b0.totalPnl}`);
  assert(near(b0.winRate, 0.5), `<30min WR=${b0.winRate}`);

  const b1 = r.buckets[1]; // 30min-2h
  assert(b1.count === 2, `30min-2h count=${b1.count}`);
  assert(near(b1.totalPnl, 17), `30min-2h totalPnl=${b1.totalPnl}`);

  console.log("PASS: bucket assignment");
}

function testExpectancyR(): void {
  // avg winner = +20, avg loser = -10 → avgPnl = (20-10)/2 = 5
  // expectancyR = 5 / 10 = 0.5
  const trades = [mk(500, 20), mk(600, -10)]; // both <30min
  const r = computeHoldTimeEffect(trades);
  const b = r.buckets[0];
  assert(b.expectancyR !== null, "expectancyR should not be null");
  assert(near(b.expectancyR!, 0.5), `expectancyR=${b.expectancyR}`);
  console.log("PASS: expectancy R calculation");
}

function testNoLosersGivesNullR(): void {
  // All winners in a bucket → no avgLoserPnl → expectancyR = null
  const trades = [mk(200, 10), mk(300, 20)];
  const r = computeHoldTimeEffect(trades);
  assert(r.buckets[0].expectancyR === null, "null R when no losers");
  console.log("PASS: null expectancyR with no losers");
}

function testBestWorst(): void {
  const trades = [
    mk(500, 50),      // <30min: best
    mk(3600, -100),   // 30min-2h: worst
    mk(10000, 30),    // 2h-8h: mid
  ];
  const r = computeHoldTimeEffect(trades);
  assert(r.bestBucket?.label === "<30min", `best=${r.bestBucket?.label}`);
  assert(r.worstBucket?.label === "30min–2h", `worst=${r.worstBucket?.label}`);
  console.log("PASS: best/worst bucket");
}

function testEmpty(): void {
  const r = computeHoldTimeEffect([]);
  assert(r.buckets.length === 0, "no buckets");
  assert(r.bestBucket === null, "no best");
  console.log("PASS: empty trades");
}

export function runHoldTimeTests(): void {
  testBucketAssignment();
  testExpectancyR();
  testNoLosersGivesNullR();
  testBestWorst();
  testEmpty();
  console.log("\nAll hold time tests passed.");
}
