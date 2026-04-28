import { Trade } from "../trade-reconstruction";
import { hlFetch, sleep } from "../hl-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FundingPayment {
  coin: string;
  timeMs: number;
  usdc: number;   // negative = paid by trader, positive = received
  szi: number;    // signed position size at payment time
}

export interface FundingCoinSummary {
  coin: string;
  total: number;  // net funding for this coin (negative = paid)
  count: number;
}

export interface FundingInsight {
  totalFunding: number;           // net total (negative = net payer)
  totalPaid: number;              // absolute sum of negative payments (>= 0)
  totalReceived: number;          // absolute sum of positive payments (>= 0)
  paymentCount: number;
  byCoin: FundingCoinSummary[];   // sorted by |total| desc
  fundingVsNetPnl: number | null; // totalFunding / netPnl; null if netPnl = 0
  rateLimited?: boolean;          // true when HL returned 429 after all retries
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface RawFundingEvent {
  time: number;
  delta: {
    type: string;
    coin: string;
    usdc: string;
    szi: string;
  };
}

export async function fetchUserFunding(
  address: string,
  startTime: Date,
  endTime?: Date
): Promise<FundingPayment[]> {
  const payload: Record<string, unknown> = {
    type: "userFunding",
    user: address,
    startTime: startTime.getTime(),
  };
  if (endTime) payload.endTime = endTime.getTime();

  const allPayments: FundingPayment[] = [];
  const seenKeys = new Set<string>();

  while (true) {
    const batch = (await hlFetch(payload)) as RawFundingEvent[];
    if (!batch.length) break;

    const newPayments: FundingPayment[] = [];
    for (const raw of batch) {
      if (raw.delta.type !== "funding") continue;
      // Deduplicate by coin+time (no unique ID on funding events)
      const key = `${raw.delta.coin}:${raw.time}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      newPayments.push({
        coin: raw.delta.coin,
        timeMs: raw.time,
        usdc: parseFloat(raw.delta.usdc),
        szi: parseFloat(raw.delta.szi),
      });
    }

    allPayments.push(...newPayments);

    // Hyperliquid pages at 500 records for userFunding
    if (batch.length < 500) break;

    const latestMs = Math.max(...newPayments.map((p) => p.timeMs));
    payload.startTime = latestMs + 1;
    await sleep(150);
  }

  return allPayments;
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

export function computeFundingInsight(
  payments: FundingPayment[],
  trades: Trade[]
): FundingInsight {
  if (payments.length === 0) {
    return {
      totalFunding: 0,
      totalPaid: 0,
      totalReceived: 0,
      paymentCount: 0,
      byCoin: [],
      fundingVsNetPnl: null,
    };
  }

  const totalFunding = payments.reduce((s, p) => s + p.usdc, 0);
  const totalPaid = payments
    .filter((p) => p.usdc < 0)
    .reduce((s, p) => s + Math.abs(p.usdc), 0);
  const totalReceived = payments
    .filter((p) => p.usdc > 0)
    .reduce((s, p) => s + p.usdc, 0);

  // Group by coin
  const byCoinMap: Record<string, { total: number; count: number }> = {};
  for (const p of payments) {
    if (!byCoinMap[p.coin]) byCoinMap[p.coin] = { total: 0, count: 0 };
    byCoinMap[p.coin].total += p.usdc;
    byCoinMap[p.coin].count++;
  }
  const byCoin: FundingCoinSummary[] = Object.entries(byCoinMap)
    .map(([coin, v]) => ({ coin, ...v }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const netPnl = trades.reduce((s, t) => s + t.pnlNet, 0);
  const fundingVsNetPnl = netPnl !== 0 ? totalFunding / netPnl : null;

  return {
    totalFunding,
    totalPaid,
    totalReceived,
    paymentCount: payments.length,
    byCoin,
    fundingVsNetPnl,
  };
}

// ---------------------------------------------------------------------------
// Self-tests (computation only — fetch requires real API)
// ---------------------------------------------------------------------------

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function near(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) < tol;
}

function mkPayment(coin: string, usdc: number, timeMs = 1000): FundingPayment {
  return { coin, timeMs, usdc, szi: 1 };
}

function mkTrade(pnlNet: number): Trade {
  return {
    coin: "BTC", side: "long",
    openAt: new Date(1000), closeAt: new Date(2000), durationSeconds: 1,
    avgEntryPx: 100, avgExitPx: 100 + pnlNet, size: 1, notional: 100,
    realizedPnl: pnlNet, feesTotal: 0, pnlNet,
    isWinner: pnlNet > 0, numFills: 1, fills: [],
  };
}

function testBasic(): void {
  const payments = [
    mkPayment("BTC", -5),
    mkPayment("BTC", -3),
    mkPayment("ETH", 2),
  ];
  const trades = [mkTrade(-20)];
  const r = computeFundingInsight(payments, trades);

  assert(near(r.totalFunding, -6), `totalFunding=${r.totalFunding}`);
  assert(near(r.totalPaid, 8), `totalPaid=${r.totalPaid}`);
  assert(near(r.totalReceived, 2), `totalReceived=${r.totalReceived}`);
  assert(r.paymentCount === 3, `count=${r.paymentCount}`);
  assert(r.byCoin[0].coin === "BTC", `byCoin[0]=${r.byCoin[0].coin}`);
  assert(near(r.byCoin[0].total, -8), `BTC total=${r.byCoin[0].total}`);
  // fundingVsNetPnl = -6 / -20 = 0.3
  assert(r.fundingVsNetPnl !== null && near(r.fundingVsNetPnl, 0.3), `ratio=${r.fundingVsNetPnl}`);
  console.log("PASS: basic computation");
}

function testEmpty(): void {
  const r = computeFundingInsight([], []);
  assert(r.totalFunding === 0, "zero total");
  assert(r.byCoin.length === 0, "no coins");
  assert(r.fundingVsNetPnl === null, "null ratio");
  console.log("PASS: empty payments");
}

function testZeroPnlGivesNullRatio(): void {
  const r = computeFundingInsight([mkPayment("BTC", -5)], [mkTrade(0)]);
  assert(r.fundingVsNetPnl === null, "null ratio when netPnl = 0");
  console.log("PASS: null ratio when netPnl = 0");
}

export function runFundingTests(): void {
  testBasic();
  testEmpty();
  testZeroPnlGivesNullRatio();
  console.log("\nAll funding tests passed.");
}
