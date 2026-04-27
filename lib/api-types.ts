import type {
  GeneralStats,
  HourlyPerformanceInsight,
  BuyHoldInsight,
} from "./insights";

export type { GeneralStats, HourlyPerformanceInsight, BuyHoldInsight };

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

export interface SyncData {
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
  };
}
