import { Trade, Side } from "./trade-reconstruction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneralStats {
  totalTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWinnerPnl: number;
  avgLoserPnl: number;
  profitFactor: number; // gross wins / |gross losses|
  avgDurationSeconds: number;
  avgWinnerDurationSeconds: number;
  avgLoserDurationSeconds: number;
  totalFeesSpent: number;
}

export interface RevengeTradeDetail {
  trade: Trade;
  previousLoss: Trade;
  gapSeconds: number;
}

export interface RevengeTradeInsight {
  windowSeconds: number;
  revengeCount: number;
  totalTrades: number;
  revengeRate: number;       // 0–1
  revengeWinRate: number;    // win rate among revenge trades
  normalWinRate: number;     // win rate among non-revenge trades
  avgGapSeconds: number;     // avg gap between loss and revenge entry
  details: RevengeTradeDetail[];
}

export interface HourSlot {
  hour: number; // 0–23 UTC
  tradeCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface HourlyPerformanceInsight {
  byHour: HourSlot[]; // 24 entries, one per hour (tradeCount may be 0)
  bestHour: HourSlot | null;
  worstHour: HourSlot | null;
}

export interface BuyHoldCoin {
  coin: string;
  tradingPnl: number;
  buyHoldPnl: number;
  delta: number;          // tradingPnl - buyHoldPnl
  firstEntryPx: number;
  lastExitPx: number;
  referenceSize: number;  // size of first trade (used for buy-hold calc)
}

export interface BuyHoldInsight {
  totalTradingPnl: number;
  totalBuyHoldPnl: number;
  delta: number;
  byCoin: BuyHoldCoin[];
}

// ---------------------------------------------------------------------------
// 1. General stats
// ---------------------------------------------------------------------------

export function computeGeneralStats(trades: Trade[]): GeneralStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0, winners: 0, losers: 0, winRate: 0, totalPnl: 0,
      avgPnl: 0, avgWinnerPnl: 0, avgLoserPnl: 0, profitFactor: 0,
      avgDurationSeconds: 0, avgWinnerDurationSeconds: 0,
      avgLoserDurationSeconds: 0, totalFeesSpent: 0,
    };
  }

  const winners = trades.filter((t) => t.pnlNet > 0);
  const losers = trades.filter((t) => t.pnlNet <= 0);
  const grossWin = winners.reduce((s, t) => s + t.pnlNet, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnlNet, 0));

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  return {
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    winRate: winners.length / trades.length,
    totalPnl: trades.reduce((s, t) => s + t.pnlNet, 0),
    avgPnl: avg(trades.map((t) => t.pnlNet)),
    avgWinnerPnl: avg(winners.map((t) => t.pnlNet)),
    avgLoserPnl: avg(losers.map((t) => t.pnlNet)),
    profitFactor: grossLoss === 0 ? Infinity : grossWin / grossLoss,
    avgDurationSeconds: avg(trades.map((t) => t.durationSeconds)),
    avgWinnerDurationSeconds: avg(winners.map((t) => t.durationSeconds)),
    avgLoserDurationSeconds: avg(losers.map((t) => t.durationSeconds)),
    totalFeesSpent: trades.reduce((s, t) => s + t.feesTotal, 0),
  };
}

// ---------------------------------------------------------------------------
// 2. Revenge trade detection
// ---------------------------------------------------------------------------

export function detectRevengeTrades(
  trades: Trade[],
  windowSeconds = 300
): RevengeTradeInsight {
  const sorted = [...trades].sort(
    (a, b) => a.openAt.getTime() - b.openAt.getTime()
  );

  const details: RevengeTradeDetail[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    // Find the most recent trade that closed before current opened
    let latestLoss: Trade | null = null;
    let latestLossCloseMs = -Infinity;

    for (let j = 0; j < i; j++) {
      const prev = sorted[j];
      const prevCloseMs = prev.closeAt.getTime();
      if (
        prevCloseMs <= current.openAt.getTime() &&
        prev.pnlNet < 0 &&
        prevCloseMs > latestLossCloseMs
      ) {
        latestLoss = prev;
        latestLossCloseMs = prevCloseMs;
      }
    }

    if (!latestLoss) continue;

    const gapSeconds =
      (current.openAt.getTime() - latestLoss.closeAt.getTime()) / 1000;

    if (gapSeconds <= windowSeconds) {
      details.push({ trade: current, previousLoss: latestLoss, gapSeconds });
    }
  }

  const revengeSet = new Set(details.map((d) => d.trade));
  const normalTrades = sorted.filter((t) => !revengeSet.has(t));

  const winRate = (arr: Trade[]) =>
    arr.length ? arr.filter((t) => t.pnlNet > 0).length / arr.length : 0;

  const avgGap =
    details.length
      ? details.reduce((s, d) => s + d.gapSeconds, 0) / details.length
      : 0;

  return {
    windowSeconds,
    revengeCount: details.length,
    totalTrades: sorted.length,
    revengeRate: sorted.length ? details.length / sorted.length : 0,
    revengeWinRate: winRate([...revengeSet]),
    normalWinRate: winRate(normalTrades),
    avgGapSeconds: avgGap,
    details,
  };
}

// ---------------------------------------------------------------------------
// 3. Hourly performance
// ---------------------------------------------------------------------------

export function computeHourlyPerformance(
  trades: Trade[]
): HourlyPerformanceInsight {
  const slots: HourSlot[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    tradeCount: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
  }));

  const buckets: Trade[][] = Array.from({ length: 24 }, () => []);

  for (const t of trades) {
    const hour = t.openAt.getUTCHours();
    buckets[hour].push(t);
  }

  for (let h = 0; h < 24; h++) {
    const bucket = buckets[h];
    if (bucket.length === 0) continue;
    const winners = bucket.filter((t) => t.pnlNet > 0).length;
    const totalPnl = bucket.reduce((s, t) => s + t.pnlNet, 0);
    slots[h] = {
      hour: h,
      tradeCount: bucket.length,
      winRate: winners / bucket.length,
      totalPnl,
      avgPnl: totalPnl / bucket.length,
    };
  }

  const active = slots.filter((s) => s.tradeCount > 0);
  const bestHour = active.length
    ? active.reduce((best, s) => (s.totalPnl > best.totalPnl ? s : best))
    : null;
  const worstHour = active.length
    ? active.reduce((worst, s) => (s.totalPnl < worst.totalPnl ? s : worst))
    : null;

  return { byHour: slots, bestHour, worstHour };
}

// ---------------------------------------------------------------------------
// 4. Buy & hold comparison
// ---------------------------------------------------------------------------

export function computeBuyHoldComparison(trades: Trade[]): BuyHoldInsight {
  const byCoin: Record<string, Trade[]> = {};
  for (const t of trades) {
    (byCoin[t.coin] ??= []).push(t);
  }

  const coinResults: BuyHoldCoin[] = [];

  for (const [coin, coinTrades] of Object.entries(byCoin)) {
    const sorted = [...coinTrades].sort(
      (a, b) => a.openAt.getTime() - b.openAt.getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const tradingPnl = coinTrades.reduce((s, t) => s + t.pnlNet, 0);

    // Buy & hold: buy first.size at first.avgEntryPx, sell at last.avgExitPx.
    // If the first trade was a short, the "hold" direction flips accordingly.
    const referenceSize = first.size;
    const direction: 1 | -1 = first.side === "long" ? 1 : -1;
    const buyHoldPnl =
      (last.avgExitPx - first.avgEntryPx) * referenceSize * direction;

    coinResults.push({
      coin,
      tradingPnl,
      buyHoldPnl,
      delta: tradingPnl - buyHoldPnl,
      firstEntryPx: first.avgEntryPx,
      lastExitPx: last.avgExitPx,
      referenceSize,
    });
  }

  coinResults.sort((a, b) => Math.abs(b.tradingPnl) - Math.abs(a.tradingPnl));

  return {
    totalTradingPnl: coinResults.reduce((s, c) => s + c.tradingPnl, 0),
    totalBuyHoldPnl: coinResults.reduce((s, c) => s + c.buyHoldPnl, 0),
    delta: coinResults.reduce((s, c) => s + c.delta, 0),
    byCoin: coinResults,
  };
}

// ---------------------------------------------------------------------------
// Self-tests
// ---------------------------------------------------------------------------

function near(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) < tol;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function makeTrade(overrides: Partial<Trade> & Pick<Trade, "coin" | "side" | "pnlNet" | "openAt" | "closeAt">): Trade {
  const base: Trade = {
    avgEntryPx: 100,
    avgExitPx: 110,
    size: 1,
    notional: 100,
    realizedPnl: overrides.pnlNet ?? 0,
    feesTotal: 0,
    durationSeconds: Math.floor(
      (overrides.closeAt.getTime() - overrides.openAt.getTime()) / 1000
    ),
    isWinner: (overrides.pnlNet ?? 0) > 0,
    numFills: 1,
    fills: [],
    ...overrides,
  };
  return base;
}

function t(openMs: number, closeMs: number, pnlNet: number, coin = "BTC", side: Side = "long"): Trade {
  return makeTrade({ coin, side, pnlNet, openAt: new Date(openMs), closeAt: new Date(closeMs) });
}

// --- General stats ---
function testGeneralStats(): void {
  const trades = [
    t(0, 1000, 10),
    t(1000, 2000, -5),
    t(2000, 3000, 20),
  ];
  const s = computeGeneralStats(trades);
  assert(s.totalTrades === 3, "totalTrades");
  assert(s.winners === 2, "winners");
  assert(s.losers === 1, "losers");
  assert(near(s.winRate, 2 / 3), "winRate");
  assert(near(s.totalPnl, 25), "totalPnl");
  assert(near(s.avgPnl, 25 / 3), "avgPnl");
  assert(near(s.profitFactor, 30 / 5), "profitFactor"); // (10+20) / 5
  console.log("PASS: general stats");
}

// --- Revenge trades ---
function testRevengeTrades(): void {
  // Loss at t=0–1000ms, revenge trade opens at t=1100ms (0.1s gap < 300s window)
  // Normal trade opens at t=600_000ms (way later)
  const trades = [
    t(0, 1000, -10),          // loss
    t(1100, 2000, 5),          // revenge (opened 0.1s after loss closed)
    t(600_000, 700_000, 8),    // normal (opened 600s after loss)
  ];
  const insight = detectRevengeTrades(trades, 300);
  assert(insight.revengeCount === 1, `revengeCount: ${insight.revengeCount}`);
  assert(near(insight.revengeRate, 1 / 3), "revengeRate");
  assert(insight.details[0].trade.pnlNet === 5, "revenge trade is the 5$ winner");
  assert(near(insight.details[0].gapSeconds, 0.1, 1e-6), "gap = 0.1s");
  console.log("PASS: revenge trades");
}

function testNoRevengeTrades(): void {
  // All trades are winners — no revenge possible
  const trades = [t(0, 1000, 10), t(2000, 3000, 5)];
  const insight = detectRevengeTrades(trades);
  assert(insight.revengeCount === 0, "no revenge on all winners");
  console.log("PASS: no revenge trades (all winners)");
}

// --- Hourly performance ---
function testHourlyPerformance(): void {
  // Three trades all opened at UTC hour 14
  const hour14 = new Date("2024-01-01T14:30:00Z");
  const trades = [
    makeTrade({ coin: "BTC", side: "long", pnlNet: 10, openAt: hour14, closeAt: new Date("2024-01-01T15:00:00Z") }),
    makeTrade({ coin: "BTC", side: "long", pnlNet: -5, openAt: hour14, closeAt: new Date("2024-01-01T15:00:00Z") }),
    makeTrade({ coin: "BTC", side: "long", pnlNet: 20, openAt: hour14, closeAt: new Date("2024-01-01T15:00:00Z") }),
  ];
  const insight = computeHourlyPerformance(trades);
  const slot14 = insight.byHour[14];
  assert(slot14.tradeCount === 3, "tradeCount at hour 14");
  assert(near(slot14.totalPnl, 25), "totalPnl at hour 14");
  assert(near(slot14.winRate, 2 / 3), "winRate at hour 14");
  assert(insight.bestHour?.hour === 14, "bestHour is 14");
  assert(insight.worstHour?.hour === 14, "worstHour is 14 (only active hour)");
  // All other hours should have tradeCount === 0
  const otherHours = insight.byHour.filter((s) => s.hour !== 14);
  assert(otherHours.every((s) => s.tradeCount === 0), "no trades in other hours");
  console.log("PASS: hourly performance");
}

// --- Buy & hold ---
function testBuyHoldComparison(): void {
  // Two BTC trades: buy at 100, sell at 90 (loss -10), buy at 90, sell at 120 (gain +30)
  // Actual trading PnL = -10 + 30 = +20
  // Buy & hold: bought 1 BTC at 100 (first entry), last exit at 120 → +20
  // Delta = 20 - 20 = 0
  const btcTrades = [
    makeTrade({ coin: "BTC", side: "long", pnlNet: -10, avgEntryPx: 100, avgExitPx: 90, size: 1, openAt: new Date(1000), closeAt: new Date(2000) }),
    makeTrade({ coin: "BTC", side: "long", pnlNet: 30, avgEntryPx: 90, avgExitPx: 120, size: 1, openAt: new Date(3000), closeAt: new Date(4000) }),
  ];
  const insight = computeBuyHoldComparison(btcTrades);
  const btc = insight.byCoin[0];
  assert(btc.coin === "BTC", "coin");
  assert(near(btc.tradingPnl, 20), "tradingPnl");
  assert(near(btc.buyHoldPnl, 20), "buyHoldPnl"); // (120 - 100) * 1 = 20
  assert(near(btc.delta, 0), "delta");
  console.log("PASS: buy & hold comparison");
}

function testBuyHoldOutperform(): void {
  // Trader repeatedly exits and re-enters, paying fees each time
  // Trading PnL = +5 (net of fees), Buy & hold would have made +20
  const trades = [
    makeTrade({ coin: "ETH", side: "long", pnlNet: 5, avgEntryPx: 1000, avgExitPx: 1020, size: 1, openAt: new Date(1000), closeAt: new Date(5000) }),
  ];
  // Override last exit to simulate a later higher price for buy&hold
  // In this single-trade case, buy&hold == trading (no re-entries)
  const insight = computeBuyHoldComparison(trades);
  assert(near(insight.byCoin[0].buyHoldPnl, 20), "buyHoldPnl = (1020-1000)*1");
  assert(near(insight.byCoin[0].delta, 5 - 20), "delta = pnlNet - buyHold");
  console.log("PASS: buy & hold outperforms active trading");
}

export function runInsightTests(): void {
  testGeneralStats();
  testRevengeTrades();
  testNoRevengeTrades();
  testHourlyPerformance();
  testBuyHoldComparison();
  testBuyHoldOutperform();
  console.log("\nAll insight tests passed.");
}
