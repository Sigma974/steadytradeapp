export type PeriodKey = "7d" | "30d" | "90d" | "180d" | "365d" | "all" | "custom";

export interface PredefinedPeriod {
  key: Exclude<PeriodKey, "custom">;
  daysBack: number;
}

export const PERIODS: PredefinedPeriod[] = [
  { key: "7d",   daysBack: 7 },
  { key: "30d",  daysBack: 30 },
  { key: "90d",  daysBack: 90 },
  { key: "180d", daysBack: 180 },
  { key: "365d", daysBack: 365 },
  { key: "all",  daysBack: 730 },
];

export const DEFAULT_DAYS = 90;

export function daysToKey(days: number | null): PeriodKey {
  if (days === null) return "custom";
  return PERIODS.find((p) => p.daysBack === days)?.key ?? "custom";
}

// The two possible onChange payloads from PeriodSelector.
export type PeriodChange =
  | { daysBack: number; startTime?: undefined; endTime?: undefined }
  | { daysBack?: undefined; startTime: number; endTime: number };
