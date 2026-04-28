import type {
  GeneralStats,
  HourlyPerformanceInsight,
  BuyHoldInsight,
} from "./insights";
import type { StreakInsight } from "./insights/streaks";
import type { LeverageInsight } from "./insights/leverage";
import type { WeekdayInsight } from "./insights/weekday";
import type { HoldTimeInsight } from "./insights/holdtime";
import type { FundingInsight } from "./insights/funding";

export type { GeneralStats, HourlyPerformanceInsight, BuyHoldInsight, StreakInsight, LeverageInsight, WeekdayInsight, HoldTimeInsight, FundingInsight };

export interface SerializedTrade {
  coin: string;
  side: "long" | "short";
  openAt: string;
  closeAt: string;
  durationSeconds: number;
  avgEntryPx: number;
  avgExitPx: number;
  size: number;
  notional: number;
  realizedPnl: number;
  feesTotal: number;
  pnlNet: number;
  isWinner: boolean;
  numFills: number;
}

export interface SerializedRevengeDetail {
  gapSeconds: number;
  trade: SerializedTrade;
  previousLoss: SerializedTrade;
}

export interface SerializedRevengeInsight {
  windowSeconds: number;
  revengeCount: number;
  totalTrades: number;
  revengeRate: number;
  revengeWinRate: number;
  normalWinRate: number;
  avgGapSeconds: number;
  details: SerializedRevengeDetail[];
}

export interface SerializedFill {
  coin: string;
  sideRaw: string;
  px: number;
  sz: number;
  timeMs: number;
  fee: number;
  closedPnl: number;
  dir: string;
  oid: number;
  tid: number;
}

// Bump this whenever SyncData.insights gains or changes fields.
// getCachedSync rejects entries with a mismatched version, forcing a re-fetch.
export const SCHEMA_VERSION = 4;

export interface SyncData {
  schemaVersion: number;
  address: string;
  fillCount: number;
  tradeCount: number;
  fetchedAt: string;
  fills: SerializedFill[];
  trades: SerializedTrade[];
  insights: {
    general: GeneralStats;
    revengeTrades: SerializedRevengeInsight;
    hourlyPerformance: HourlyPerformanceInsight;
    buyHold: BuyHoldInsight;
    streaks: StreakInsight;
    leverage: LeverageInsight;
    weekday: WeekdayInsight;
    holdTime: HoldTimeInsight;
    funding: FundingInsight;
  };
}
