import type { SyncData } from "@/lib/api-types";
import { fmtPct, fmtCompact, fmtCompactUsd } from "@/lib/format";

export type VerdictType = "warning" | "success" | "info";

export type VerdictKey =
  | "revenge"
  | "scalping"
  | "scalpingNoLong"
  | "drawdown"
  | "decliningWR"
  | "longBias"
  | "funding"
  | "success"
  | "neutral";

export interface Verdict {
  type: VerdictType;
  key: VerdictKey;
  params: Record<string, string | number>;
}

const MIN_TRADES = 10;

export function calculateVerdict(data: SyncData, profileType?: string | null): Verdict | null {
  const { general, revengeTrades, holdTime, equity, recentWinRate, directionWinRate, funding } =
    data.insights;

  if (general.totalTrades < MIN_TRADES) return null;

  // 1 — Revenge trading
  const revengePnl = revengeTrades.details.reduce((s, d) => s + d.trade.pnlNet, 0);
  if (revengeTrades.revengeRate > 0.25 && revengePnl < 0) {
    return {
      type: "warning",
      key: "revenge",
      params: {
        pct: (revengeTrades.revengeRate * 100).toFixed(0),
        window: Math.round(revengeTrades.windowSeconds / 60),
        amount: fmtCompactUsd(Math.abs(revengePnl)),
      },
    };
  }

  // 2 — Scalping not working (skipped for scalpers — that's their intended style)
  const shortBucket = holdTime.buckets.find((b) => b.maxSeconds === 1800);
  if (profileType !== "scalper" && shortBucket && shortBucket.pctOfTrades > 0.6 && shortBucket.totalPnl < 0) {
    // "long" = any bucket starting at 2h+ (includes 2h–8h, 8h–24h, >24h)
    const hasLongTrades = holdTime.buckets.some((b) => b.minSeconds >= 7200 && b.count > 0);
    const longPnl = holdTime.buckets
      .filter((b) => b.minSeconds >= 7200)
      .reduce((s, b) => s + b.totalPnl, 0);
    if (!hasLongTrades || longPnl <= 0) {
      return {
        type: "warning",
        key: "scalpingNoLong",
        params: {
          pct: (shortBucket.pctOfTrades * 100).toFixed(0),
          amount: fmtCompactUsd(Math.abs(shortBucket.totalPnl)),
        },
      };
    }
    return {
      type: "warning",
      key: "scalping",
      params: {
        pct: (shortBucket.pctOfTrades * 100).toFixed(0),
        amount: fmtCompactUsd(Math.abs(shortBucket.totalPnl)),
        longAmount: fmtCompact(longPnl),
      },
    };
  }

  // 3 — Max drawdown > 25%
  if (equity.maxDrawdown && equity.maxDrawdown.pct > 0.25) {
    return {
      type: "warning",
      key: "drawdown",
      params: { pct: fmtPct(equity.maxDrawdown.pct, 1).replace("%", "") },
    };
  }

  // 4 — Declining recent WR (> 10 points below historical)
  if (recentWinRate.hasEnoughHistory && recentWinRate.delta < -0.1) {
    return {
      type: "warning",
      key: "decliningWR",
      params: {
        days: recentWinRate.recentDays,
        recent: (recentWinRate.recentWinRate * 100).toFixed(0),
        diff: (Math.abs(recentWinRate.delta) * 100).toFixed(0),
        total: (recentWinRate.totalWinRate * 100).toFixed(0),
      },
    };
  }

  // 5 — Long bias (both sides ≥5 trades, gap > 15pts, shorts losing money)
  if (
    directionWinRate.long.trades >= 5 &&
    directionWinRate.short.trades >= 5 &&
    directionWinRate.delta > 0.15 &&
    directionWinRate.short.totalPnl < 0
  ) {
    return {
      type: "info",
      key: "longBias",
      params: {
        longWR: (directionWinRate.long.winRate * 100).toFixed(0),
        shortWR: (directionWinRate.short.winRate * 100).toFixed(0),
        amount: fmtCompactUsd(Math.abs(directionWinRate.short.totalPnl)),
      },
    };
  }

  // 6 — Funding fees (position traders hold longer, lower threshold)
  const absPnl = Math.abs(general.totalPnl);
  const fundingThreshold = profileType === "position" ? 0.03 : 0.05;
  if (absPnl > 0 && !funding.rateLimited && funding.totalPaid > fundingThreshold * absPnl) {
    return {
      type: "info",
      key: "funding",
      params: {
        amount: fmtCompactUsd(funding.totalPaid),
        pct: ((funding.totalPaid / absPnl) * 100).toFixed(1),
      },
    };
  }

  // 7 — Success
  const ddOk = !equity.maxDrawdown || equity.maxDrawdown.pct < 0.15;
  if (general.totalPnl > 0 && ddOk && general.winRate > 0.5) {
    return { type: "success", key: "success", params: {} };
  }

  // 8 — Neutral
  return { type: "info", key: "neutral", params: {} };
}
