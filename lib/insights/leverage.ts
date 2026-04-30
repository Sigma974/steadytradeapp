import { Trade } from "../trade-reconstruction";

export interface SizeBucket {
  label: string;
  minNotional: number;
  maxNotional: number;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  pctOfTrades: number;
}

export interface LeverageInsight {
  buckets: SizeBucket[];       // only non-empty buckets, sorted by minNotional
  bestBucket: SizeBucket | null;
  worstBucket: SizeBucket | null;
  totalTrades: number;
}

// Notional thresholds (USD) — position size tiers.
const THRESHOLDS: Array<{ label: string; min: number; max: number }> = [
  { label: "<$1K",       min: 0,       max: 1_000 },
  { label: "$1K–$5K",    min: 1_000,   max: 5_000 },
  { label: "$5K–$25K",   min: 5_000,   max: 25_000 },
  { label: "$25K–$100K", min: 25_000,  max: 100_000 },
  { label: ">$100K",     min: 100_000, max: Infinity },
];

export function computeLeverageEffect(trades: Trade[]): LeverageInsight {
  if (trades.length === 0) {
    return { buckets: [], bestBucket: null, worstBucket: null, totalTrades: 0 };
  }

  const buckets: SizeBucket[] = [];

  for (const { label, min, max } of THRESHOLDS) {
    const group = trades.filter((t) => t.notional >= min && t.notional < max);
    if (group.length === 0) continue;

    const winners = group.filter((t) => t.isWinner).length;
    const totalPnl = group.reduce((s, t) => s + t.pnlNet, 0);

    buckets.push({
      label,
      minNotional: min,
      maxNotional: max,
      count: group.length,
      winRate: winners / group.length,
      totalPnl,
      avgPnl: totalPnl / group.length,
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

function mk(notional: number, pnlNet: number): Trade {
  const px = notional; // sz = 1 so notional = px
  return {
    coin: "BTC",
    side: "long",
    openAt: new Date(1000),
    closeAt: new Date(2000),
    durationSeconds: 1,
    avgEntryPx: px,
    avgExitPx: px + pnlNet,
    size: 1,
    notional,
    realizedPnl: pnlNet,
    feesTotal: 0,
    pnlNet,
    isWinner: pnlNet > 0,
    numFills: 1,
    fills: [],
  };
}

function testBasicBucketing(): void {
  const trades = [
    mk(500, 10),    // <$1K bucket  → winner
    mk(800, -5),   // <$1K bucket  → loser
    mk(2000, 20),  // $1K-$5K      → winner
    mk(10000, -15), // $5K-$25K    → loser
  ];
  const r = computeLeverageEffect(trades);
  assert(r.totalTrades === 4, `totalTrades=${r.totalTrades}`);
  assert(r.buckets.length === 3, `buckets=${r.buckets.length}`);

  const b0 = r.buckets[0]; // <$1K
  assert(b0.count === 2, `<$1K count=${b0.count}`);
  assert(near(b0.totalPnl, 5), `<$1K totalPnl=${b0.totalPnl}`);
  assert(near(b0.winRate, 0.5), `<$1K winRate=${b0.winRate}`);
  assert(near(b0.pctOfTrades, 0.5), `<$1K pct=${b0.pctOfTrades}`);

  const b1 = r.buckets[1]; // $1K-$5K
  assert(b1.count === 1, `$1K-$5K count=${b1.count}`);
  assert(near(b1.totalPnl, 20), `$1K-$5K totalPnl=${b1.totalPnl}`);
  assert(near(b1.winRate, 1), `$1K-$5K winRate=${b1.winRate}`);

  console.log("PASS: basic bucketing");
}

function testBestWorst(): void {
  const trades = [
    mk(500, 50),    // <$1K: best
    mk(3000, -100), // $1K-$5K: worst
    mk(8000, 30),   // $5K-$25K: mid
  ];
  const r = computeLeverageEffect(trades);
  assert(r.bestBucket?.label === "<$1K", `bestBucket=${r.bestBucket?.label}`);
  assert(r.worstBucket?.label === "$1K–$5K", `worstBucket=${r.worstBucket?.label}`);
  console.log("PASS: best/worst bucket identification");
}

function testEmpty(): void {
  const r = computeLeverageEffect([]);
  assert(r.buckets.length === 0, "no buckets for empty trades");
  assert(r.bestBucket === null, "no best bucket");
  assert(r.worstBucket === null, "no worst bucket");
  console.log("PASS: empty trades");
}

function testSingleBucket(): void {
  // All trades in same bucket — only 1 bucket populated
  const trades = [mk(600, 10), mk(700, 20), mk(900, -5)];
  const r = computeLeverageEffect(trades);
  assert(r.buckets.length === 1, `buckets=${r.buckets.length}`);
  assert(r.buckets[0].label === "<$1K", "single bucket label");
  assert(r.bestBucket === r.worstBucket, "best=worst when single bucket");
  console.log("PASS: single bucket");
}

export function runLeverageTests(): void {
  testBasicBucketing();
  testBestWorst();
  testEmpty();
  testSingleBucket();
  console.log("\nAll leverage tests passed.");
}
