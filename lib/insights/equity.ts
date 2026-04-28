import type { Trade } from "../trade-reconstruction";

export interface EquityPoint {
  date: string;
  equity: number;
  idx: number;
}

export interface DrawdownPeriod {
  amountUsd: number;
  pct: number;
  peakIdx: number;
  troughIdx: number;
}

export interface EquityInsight {
  points: EquityPoint[];
  maxDrawdown: DrawdownPeriod | null;
  finalEquity: number;
}

export function computeEquityCurve(trades: Trade[]): EquityInsight {
  if (trades.length === 0) {
    return { points: [], maxDrawdown: null, finalEquity: 0 };
  }

  const sorted = [...trades].sort((a, b) => a.closeAt.getTime() - b.closeAt.getTime());

  const points: EquityPoint[] = [];
  let cumulative = 0;
  let runningPeak = 0;
  let runningPeakIdx = 0;
  let maxDrawdown: DrawdownPeriod | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    cumulative += trade.pnlNet;
    const idx = i + 1;
    const date = trade.closeAt.toISOString().slice(0, 10);

    points.push({ date, equity: cumulative, idx });

    if (cumulative > runningPeak) {
      runningPeak = cumulative;
      runningPeakIdx = idx;
    }

    if (runningPeak > 0) {
      const dd = runningPeak - cumulative;
      if (dd > (maxDrawdown?.amountUsd ?? 0)) {
        maxDrawdown = {
          amountUsd: dd,
          pct: dd / runningPeak,
          peakIdx: runningPeakIdx,
          troughIdx: idx,
        };
      }
    }
  }

  return {
    points,
    maxDrawdown: maxDrawdown && maxDrawdown.amountUsd > 0.01 ? maxDrawdown : null,
    finalEquity: cumulative,
  };
}
