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
  peakDate: string;
  troughDate: string;
  peakEquity: number;
  troughEquity: number;
  recoveryDays: number | null;
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
  let runningPeakDate = "";
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
      runningPeakDate = date;
    }

    if (runningPeak > 0) {
      const dd = runningPeak - cumulative;
      if (dd > (maxDrawdown?.amountUsd ?? 0)) {
        maxDrawdown = {
          amountUsd: dd,
          pct: dd / runningPeak,
          peakIdx: runningPeakIdx,
          troughIdx: idx,
          peakDate: runningPeakDate,
          troughDate: date,
          peakEquity: runningPeak,
          troughEquity: cumulative,
          recoveryDays: null,
        };
      }
    }
  }

  if (!maxDrawdown || maxDrawdown.amountUsd <= 0.01) {
    return { points, maxDrawdown: null, finalEquity: cumulative };
  }

  // Scan forward from the trough to find the first recovery point (equity >= HWM).
  // troughIdx is 1-based, so the next point in the 0-based array is at troughIdx.
  const troughTime = new Date(maxDrawdown.troughDate + "T00:00:00Z").getTime();
  for (let j = maxDrawdown.troughIdx; j < points.length; j++) {
    if (points[j].equity >= maxDrawdown.peakEquity) {
      const recoveryTime = new Date(points[j].date + "T00:00:00Z").getTime();
      maxDrawdown.recoveryDays = Math.round((recoveryTime - troughTime) / 86_400_000);
      break;
    }
  }

  return { points, maxDrawdown, finalEquity: cumulative };
}
