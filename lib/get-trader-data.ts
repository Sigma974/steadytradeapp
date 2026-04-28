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

export async function getTraderData(
  address: string,
  daysBack = 90,
  revengeWindowSeconds = 300
): Promise<SyncData> {
  const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [fillsResult, fundingResult] = await Promise.allSettled([
    fetchUserFills(address, start),
    fetchUserFunding(address, start),
  ]);

  if (fillsResult.status === "rejected") throw fillsResult.reason;
  const fills = fillsResult.value;

  const fundingRateLimited =
    fundingResult.status === "rejected" &&
    fundingResult.reason instanceof HLRateLimitError;
  if (fundingResult.status === "rejected" && !fundingRateLimited) {
    throw fundingResult.reason;
  }
  const fundingPayments =
    fundingResult.status === "fulfilled" ? fundingResult.value : [];

  const trades = reconstructTrades(fills);
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
