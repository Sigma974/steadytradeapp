import {
  fetchUserFills,
  reconstructTrades,
  Fill,
  Trade,
} from "./trade-reconstruction";
import {
  computeGeneralStats,
  detectRevengeTrades,
  computeHourlyPerformance,
  computeBuyHoldComparison,
} from "./insights";
import { detectStreaks } from "./insights/streaks";
import { computeLeverageEffect } from "./insights/leverage";
import { computeWeekdayPerformance } from "./insights/weekday";
import { computeHoldTimeEffect } from "./insights/holdtime";
import { fetchUserFunding, computeFundingInsight } from "./insights/funding";
import { computeDirectionWinRate } from "./insights/direction";
import { computeRRInsight } from "./insights/rr";
import { computeTPSLInsight } from "./insights/tpsl";
import { computeRecentWinRate } from "./insights/recentwr";
import { computeEquityCurve } from "./insights/equity";
import { getCachedSync, setCachedSync } from "./db-cache";
import type { SyncData, SerializedRevengeInsight } from "./api-types";
import { SCHEMA_VERSION } from "./api-types";
import { HLRateLimitError } from "./hl-fetch";

function serializeFill(f: Fill) {
  return {
    coin: f.coin, sideRaw: f.sideRaw, px: f.px, sz: f.sz,
    timeMs: f.timeMs, fee: f.fee, closedPnl: f.closedPnl,
    dir: f.dir, oid: f.oid, tid: f.tid,
  };
}

function serializeTrade(t: Trade) {
  return {
    coin: t.coin, side: t.side,
    openAt: t.openAt.toISOString(), closeAt: t.closeAt.toISOString(),
    durationSeconds: t.durationSeconds, avgEntryPx: t.avgEntryPx,
    avgExitPx: t.avgExitPx, size: t.size, notional: t.notional,
    realizedPnl: t.realizedPnl, feesTotal: t.feesTotal,
    pnlNet: t.pnlNet, isWinner: t.isWinner, numFills: t.numFills,
  };
}

// Extra days of fills fetched before the analysis window to correctly seed the
// FIFO queue for positions that were opened before the requested start date.
const WARMUP_DAYS = 30;

export async function getTraderData(
  address: string,
  daysBack = 90,
  revengeWindowSeconds = 300
): Promise<SyncData> {
  const requestedStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const warmupStart = new Date(
    requestedStart.getTime() - WARMUP_DAYS * 24 * 60 * 60 * 1000
  );

  const [fillsResult, fundingResult] = await Promise.allSettled([
    fetchUserFills(address, warmupStart),
    fetchUserFunding(address, requestedStart),
  ]);

  if (fillsResult.status === "rejected") throw fillsResult.reason;
  const allFills = fillsResult.value;

  // Only expose fills within the requested window in the serialized response
  const requestedStartMs = requestedStart.getTime();
  const fills = allFills.filter((f) => f.timeMs >= requestedStartMs);

  const fundingRateLimited =
    fundingResult.status === "rejected" &&
    fundingResult.reason instanceof HLRateLimitError;
  if (fundingResult.status === "rejected" && !fundingRateLimited) {
    throw fundingResult.reason;
  }
  const fundingPayments =
    fundingResult.status === "fulfilled" ? fundingResult.value : [];

  // Pass all fills (incl. warmup) so the queue is correctly seeded.
  // emitAfter ensures only trades closed within the requested window are returned.
  const trades = reconstructTrades(allFills, requestedStart);
  const revenge = detectRevengeTrades(trades, revengeWindowSeconds);

  const serializedRevenge: SerializedRevengeInsight = {
    ...revenge,
    details: revenge.details.map((d) => ({
      gapSeconds: d.gapSeconds,
      trade: serializeTrade(d.trade),
      previousLoss: serializeTrade(d.previousLoss),
    })),
  };

  const response: SyncData = {
    schemaVersion: SCHEMA_VERSION,
    address,
    fills: fills.map(serializeFill),
    trades: trades.map(serializeTrade),
    fillCount: fills.length,
    tradeCount: trades.length,
    fetchedAt: new Date().toISOString(),
    insights: {
      general: computeGeneralStats(trades),
      revengeTrades: serializedRevenge,
      hourlyPerformance: computeHourlyPerformance(trades),
      buyHold: computeBuyHoldComparison(trades),
      streaks: detectStreaks(trades),
      leverage: computeLeverageEffect(trades),
      weekday: computeWeekdayPerformance(trades),
      holdTime: computeHoldTimeEffect(trades),
      funding: { ...computeFundingInsight(fundingPayments, trades), rateLimited: fundingRateLimited || undefined },
      directionWinRate: computeDirectionWinRate(trades),
      rr: computeRRInsight(trades),
      tpsl: computeTPSLInsight(trades),
      recentWinRate: computeRecentWinRate(trades),
      equity: computeEquityCurve(trades),
    },
  };

  setCachedSync(address, daysBack, response);
  return response;
}

// Returns cached data immediately if fresh, otherwise returns null.
// Call getTraderData() if you need a guaranteed fresh result.
export async function getCachedTraderData(
  address: string,
  daysBack = 90
): Promise<SyncData | null> {
  return getCachedSync(address, daysBack);
}
