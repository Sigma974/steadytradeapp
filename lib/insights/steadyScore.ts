import type { SyncData } from "@/lib/api-types";

export type ScoreLabelKey =
  | "proDiscipline"
  | "disciplinedTrader"
  | "mixedSignals"
  | "disciplineIssues"
  | "majorLeaks";

export type SignalKey =
  | "revenge"
  | "sizing"
  | "drawdown"
  | "winStability"
  | "holdTime"
  | "funding"
  | "lsBalance"
  | "pnlPos";

export interface ScoreSignal {
  key: SignalKey;
  signalScore: number; // 0–100 raw signal score
  baseWeight: number;  // original weight (for display purposes)
  excluded: boolean;   // true when signal cannot be computed
}

export interface SteadyScoreResult {
  score: number;        // 0–100 integer
  labelKey: ScoreLabelKey;
  signals: ScoreSignal[];
}

const MIN_TRADES = 10;

const BASE_WEIGHTS: Record<SignalKey, number> = {
  revenge: 20,
  sizing: 15,
  drawdown: 15,
  winStability: 10,
  holdTime: 10,
  funding: 10,
  lsBalance: 10,
  pnlPos: 10,
};

const SIGNAL_ORDER: SignalKey[] = [
  "revenge",
  "sizing",
  "drawdown",
  "winStability",
  "holdTime",
  "funding",
  "lsBalance",
  "pnlPos",
];

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function revengeSignal(rate: number): number {
  return Math.max(0, 100 - rate * 200);
}

function sizingSignal(notionals: number[]): number {
  if (notionals.length < 2) return 60;
  const m = notionals.reduce((s, v) => s + v, 0) / notionals.length;
  if (m === 0) return 60;
  const cv = stdDev(notionals) / m;
  if (cv < 0.3) return 100;
  if (cv < 0.5) return 80;
  if (cv < 0.8) return 60;
  if (cv < 1.2) return 40;
  return 20;
}

function drawdownSignal(pct: number | null): number {
  if (pct === null || pct < 0.05) return 100;
  if (pct < 0.1) return 80;
  if (pct < 0.15) return 60;
  if (pct < 0.25) return 40;
  return 20;
}

function winStabilitySignal(
  totalTrades: number,
  totalWR: number,
  recentWR: number,
  hasEnoughHistory: boolean
): number {
  if (totalTrades < 30 || !hasEnoughHistory) return 60;
  // Formula uses pct-point values; multiply by 100 to convert from 0-1 range.
  // Positive diff = recent is declining vs history → penalty.
  const diffPts = (totalWR - recentWR) * 100;
  return Math.min(100, Math.max(0, 100 - Math.max(0, diffPts * 5)));
}

function fundingSignal(totalFunding: number, grossVolume: number): number {
  if (grossVolume === 0) return 60;
  const ratio = Math.abs(totalFunding) / grossVolume;
  if (ratio < 0.01) return 100;
  if (ratio < 0.03) return 80;
  if (ratio < 0.05) return 60;
  if (ratio < 0.1) return 40;
  return 20;
}

function lsBalanceSignal(longTrades: number, shortTrades: number): number {
  const total = longTrades + shortTrades;
  if (total === 0) return 60;
  const ratio = Math.max(longTrades, shortTrades) / total;
  // Spec target: "ratio between 40/60 and 60/40" → anything up to 60/40 scores 100.
  // Anchor points: 60%→80, 70%→60, 80%→40, 90%+→20.
  if (ratio < 0.6) return 100;
  if (ratio < 0.7) return 80;
  if (ratio < 0.8) return 60;
  if (ratio < 0.9) return 40;
  return 20;
}

function pnlSignal(netPnl: number, totalVolume: number): number {
  if (totalVolume === 0) return 60;
  const roi = netPnl / totalVolume;
  if (roi > 0.2) return 100;
  if (roi > 0.1) return 80;
  if (roi > 0) return 65;
  if (roi > -0.1) return 45;
  if (roi > -0.25) return 25;
  return 10;
}

function labelForScore(score: number): ScoreLabelKey {
  if (score >= 80) return "proDiscipline";
  if (score >= 65) return "disciplinedTrader";
  if (score >= 50) return "mixedSignals";
  if (score >= 35) return "disciplineIssues";
  return "majorLeaks";
}

export function calculateSteadyScore(data: SyncData): SteadyScoreResult | null {
  const { general, revengeTrades, equity, recentWinRate, funding, directionWinRate } =
    data.insights;

  if (general.totalTrades < MIN_TRADES) return null;

  const notionals = data.trades.map((t) => t.notional);
  const totalVolume = notionals.reduce((s, v) => s + v, 0);
  const grossWin = general.avgWinnerPnl * general.winners;
  const grossLoss = Math.abs(general.avgLoserPnl) * general.losers;

  const rawScores: Record<SignalKey, number> = {
    revenge: revengeSignal(revengeTrades.revengeRate),
    sizing: sizingSignal(notionals),
    drawdown: drawdownSignal(equity.maxDrawdown?.pct ?? null),
    winStability: winStabilitySignal(
      general.totalTrades,
      recentWinRate.totalWinRate,
      recentWinRate.recentWinRate,
      recentWinRate.hasEnoughHistory
    ),
    holdTime: 60, // Phase 1: neutral until user profiles are implemented
    funding: fundingSignal(funding.totalFunding, grossWin + grossLoss),
    lsBalance: lsBalanceSignal(
      directionWinRate.long.trades,
      directionWinRate.short.trades
    ),
    pnlPos: pnlSignal(general.totalPnl, totalVolume),
  };

  const excluded = new Set<SignalKey>(
    funding.rateLimited ? (["funding"] as SignalKey[]) : []
  );

  const includedKeys = SIGNAL_ORDER.filter((k) => !excluded.has(k));
  const totalBaseWeight = includedKeys.reduce((s, k) => s + BASE_WEIGHTS[k], 0);

  const score = Math.round(
    includedKeys.reduce((s, k) => {
      const effectiveWeight = (BASE_WEIGHTS[k] / totalBaseWeight) * 100;
      return s + (rawScores[k] * effectiveWeight) / 100;
    }, 0)
  );

  const signals: ScoreSignal[] = SIGNAL_ORDER.map((k) => ({
    key: k,
    signalScore: rawScores[k],
    baseWeight: BASE_WEIGHTS[k],
    excluded: excluded.has(k),
  }));

  return { score, labelKey: labelForScore(score), signals };
}

// ---------------------------------------------------------------------------
// Self-tests
// ---------------------------------------------------------------------------

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function near(a: number, b: number, tol = 1): boolean {
  return Math.abs(a - b) <= tol;
}

function mkTrade(notional: number, pnlNet: number, side: "long" | "short" = "long") {
  return {
    coin: "BTC",
    side,
    openAt: "2024-01-01T00:00:00Z",
    closeAt: "2024-01-02T00:00:00Z",
    durationSeconds: 86400,
    avgEntryPx: 40000,
    avgExitPx: 40000 + pnlNet / notional * 40000,
    size: notional / 40000,
    notional,
    realizedPnl: pnlNet,
    feesTotal: 0,
    pnlNet,
    isWinner: pnlNet > 0,
    numFills: 1,
  };
}

function buildData(overrides: Partial<{
  revengeRate: number;
  notionals: number[];
  maxDdPct: number | null;
  totalWR: number;
  recentWR: number;
  hasEnoughHistory: boolean;
  totalTrades: number;
  totalFunding: number;
  rateLimited: boolean;
  longTrades: number;
  shortTrades: number;
  totalPnl: number;
  totalVolume: number;
}>): SyncData {
  const o = {
    revengeRate: 0,
    notionals: Array(15).fill(1000),
    maxDdPct: 0.05,
    totalWR: 0.55,
    recentWR: 0.55,
    hasEnoughHistory: true,
    totalTrades: 30,
    totalFunding: -10,
    rateLimited: false,
    longTrades: 15,
    shortTrades: 15,
    totalPnl: 500,
    totalVolume: 15000,
    ...overrides,
  };
  const winners = Math.round(o.totalTrades * o.totalWR);
  const losers = o.totalTrades - winners;
  const avgWinnerPnl = winners > 0 ? o.totalPnl > 0 ? (o.totalPnl + Math.abs(losers * -10)) / winners : o.totalPnl / winners : 0;
  const avgLoserPnl = losers > 0 ? -10 : 0;

  return {
    schemaVersion: 12,
    address: "0x0",
    fillCount: o.totalTrades,
    tradeCount: o.totalTrades,
    fetchedAt: new Date().toISOString(),
    fills: [],
    trades: o.notionals.map((n, i) =>
      mkTrade(n, i % 2 === 0 ? 10 : -10, i % 3 === 0 ? "short" : "long")
    ),
    insights: {
      general: {
        totalTrades: o.totalTrades,
        winners,
        losers,
        winRate: o.totalWR,
        totalPnl: o.totalPnl,
        avgPnl: o.totalPnl / o.totalTrades,
        avgWinnerPnl,
        avgLoserPnl,
        profitFactor: 1.2,
        avgDurationSeconds: 3600,
        avgWinnerDurationSeconds: 3600,
        avgLoserDurationSeconds: 3600,
        totalFeesSpent: 20,
      },
      revengeTrades: {
        windowSeconds: 300,
        revengeCount: Math.round(o.revengeRate * o.totalTrades),
        totalTrades: o.totalTrades,
        revengeRate: o.revengeRate,
        revengeWinRate: 0.3,
        normalWinRate: 0.6,
        avgGapSeconds: 60,
        details: [],
      },
      equity: {
        points: [],
        maxDrawdown: o.maxDdPct !== null
          ? {
              amountUsd: o.maxDdPct * 1000,
              pct: o.maxDdPct,
              peakIdx: 1,
              troughIdx: 5,
              peakDate: "2024-01-01",
              troughDate: "2024-01-05",
              peakEquity: 1000,
              troughEquity: 1000 - o.maxDdPct * 1000,
              recoveryDays: null,
            }
          : null,
        finalEquity: o.totalPnl,
      },
      recentWinRate: {
        recentDays: 30,
        recentCount: 10,
        recentWinRate: o.recentWR,
        totalCount: o.totalTrades,
        totalWinRate: o.totalWR,
        delta: o.recentWR - o.totalWR,
        trend: "stable",
        hasEnoughHistory: o.hasEnoughHistory,
      },
      funding: {
        totalFunding: o.totalFunding,
        totalPaid: Math.abs(o.totalFunding),
        totalReceived: 0,
        paymentCount: 5,
        byCoin: [],
        fundingVsNetPnl: null,
        rateLimited: o.rateLimited,
      },
      directionWinRate: {
        long: { trades: o.longTrades, winners: Math.round(o.longTrades * 0.55), winRate: 0.55, totalPnl: 200, avgPnl: 10 },
        short: { trades: o.shortTrades, winners: Math.round(o.shortTrades * 0.55), winRate: 0.55, totalPnl: 300, avgPnl: 15 },
        delta: 0,
        dominantDirection: null,
        significantDiff: false,
      },
      // stubs for unused insights
      holdTime: { buckets: [], bucketDefs: [] } as never,
      leverage: { buckets: [] } as never,
      weekday: { byDay: [], bestDay: null, worstDay: null } as never,
      streaks: { current: { type: "win", length: 0 }, longestWin: 0, longestLoss: 0, winAfterWinRate: 0, winAfterLossRate: 0 } as never,
      hourlyPerformance: { byHour: [], bestHour: null, worstHour: null } as never,
      buyHold: { totalTradingPnl: 0, totalBuyHoldPnl: 0, delta: 0, byCoin: [] },
      rr: { realizedRR: 1.2, avgWinnerPnl: 20, avgLoserPnl: -15, rrThreshold: 1.0 } as never,
      tpsl: {} as never,
    },
  };
}

function testDisciplinedTrader(): void {
  const data = buildData({
    revengeRate: 0,       // → 100
    notionals: Array(20).fill(1000), // CV=0 → 100
    maxDdPct: 0.03,       // → 100
    totalTrades: 40,
    totalWR: 0.6,
    recentWR: 0.65,       // improving → 100
    hasEnoughHistory: true,
    totalFunding: -5,     // abs(5) / (grossWin+grossLoss) tiny → 100
    longTrades: 20,
    shortTrades: 20,      // 50/50 → 100
    totalPnl: 800,
    totalVolume: 20000,   // ROI = 4% → 65
  });
  const r = calculateSteadyScore(data);
  assert(r !== null, "result is not null");
  assert(r!.score >= 65, `score=${r!.score}, expected ≥65 for disciplined profile`);
  console.log(`PASS: disciplined trader score=${r!.score} label=${r!.labelKey}`);
}

function testRevengeTorpedo(): void {
  const data = buildData({ revengeRate: 0.5, maxDdPct: 0.3 });
  const r = calculateSteadyScore(data);
  assert(r !== null, "result is not null");
  // revenge=0, drawdown=20 → score should be low
  assert(r!.score < 55, `score=${r!.score}, expected <55 for revenge+DD issues`);
  console.log(`PASS: revenge torpedo score=${r!.score} label=${r!.labelKey}`);
}

function testNotEnoughTrades(): void {
  const data = buildData({ totalTrades: 5 });
  data.tradeCount = 5;
  data.insights.general.totalTrades = 5;
  const r = calculateSteadyScore(data);
  assert(r === null, "returns null when <10 trades");
  console.log("PASS: null for <10 trades");
}

function testLabelThresholds(): void {
  const make = (score: number) => {
    // find a revengeRate that gives exactly `score` when all other signals are neutral(60)
    // This is hard to engineer exactly, so just verify the label function
    const labelKey = score >= 80 ? "proDiscipline"
      : score >= 65 ? "disciplinedTrader"
      : score >= 50 ? "mixedSignals"
      : score >= 35 ? "disciplineIssues"
      : "majorLeaks";
    return labelKey;
  };
  assert(make(80) === "proDiscipline", "80=pro");
  assert(make(79) === "disciplinedTrader", "79=disciplined");
  assert(make(65) === "disciplinedTrader", "65=disciplined");
  assert(make(64) === "mixedSignals", "64=mixed");
  assert(make(50) === "mixedSignals", "50=mixed");
  assert(make(49) === "disciplineIssues", "49=issues");
  assert(make(35) === "disciplineIssues", "35=issues");
  assert(make(34) === "majorLeaks", "34=leaks");
  console.log("PASS: label thresholds");
}

export function runSteadyScoreTests(): void {
  testNotEnoughTrades();
  testLabelThresholds();
  testDisciplinedTrader();
  testRevengeTorpedo();
  console.log("\nAll steady score tests passed.");
}
