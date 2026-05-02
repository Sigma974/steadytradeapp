export type PeriodKey = "7d" | "30d" | "90d" | "6m" | "1y" | "all" | "custom";

export interface PredefinedPeriod {
  key: Exclude<PeriodKey, "custom">;
  daysBack: number;
}

export const PERIODS: PredefinedPeriod[] = [
  { key: "7d",  daysBack: 7 },
  { key: "30d", daysBack: 30 },
  { key: "90d", daysBack: 90 },
  { key: "6m",  daysBack: 180 },
  { key: "1y",  daysBack: 365 },
  // "all" uses a 10-year window to cover the full Hyperliquid history.
  { key: "all", daysBack: 3650 },
];

export const DEFAULT_DAYS = 30;

export function daysToKey(days: number | null): PeriodKey {
  if (days === null) return "custom";
  return PERIODS.find((p) => p.daysBack === days)?.key ?? "custom";
}

// The two possible onChange payloads from PeriodSelector.
export type PeriodChange =
  | { daysBack: number; startTime?: undefined; endTime?: undefined }
  | { daysBack?: undefined; startTime: number; endTime: number };
