import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralStats } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtDuration, fmtUsd, fmtNumber, fmtCompact, fmtCompactUsd, fmtCompactNum, pnlColor } from "@/lib/format";

interface Props {
  stats: GeneralStats;
}

function Stat({ label, value, sub, valueClass, exactTitle }: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  exactTitle?: string;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-2xl font-mono font-semibold ${valueClass ?? "text-slate-100"}`} title={exactTitle}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function StatGrid({ stats }: Props) {
  const t = useTranslations("Cards.StatGrid");

  const pfDisplay =
    stats.profitFactor === Infinity
      ? "∞"
      : fmtNumber(stats.profitFactor);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat
        label={t("totalPnl")}
        value={fmtCompact(stats.totalPnl)}
        sub={t("totalPnlSub", { avg: fmtCompact(stats.avgPnl) })}
        valueClass={pnlColor(stats.totalPnl) + " text-2xl font-mono font-semibold"}
        exactTitle={fmtPnl(stats.totalPnl)}
      />
      <Stat
        label={t("winRate")}
        value={fmtPct(stats.winRate)}
        sub={t("winRateSub", { winners: stats.winners, losers: stats.losers })}
        valueClass={pnlColor(stats.winRate - 0.5) + " text-2xl font-mono font-semibold"}
      />
      <Stat
        label={t("profitFactor")}
        value={pfDisplay}
        sub={t("profitFactorSub")}
        valueClass={pnlColor(stats.profitFactor - 1) + " text-2xl font-mono font-semibold"}
      />
      <Stat
        label={t("totalTrades")}
        value={fmtCompactNum(stats.totalTrades)}
        sub={t("totalTradesSub", { duration: fmtDuration(Math.round(stats.avgDurationSeconds)) })}
        exactTitle={String(stats.totalTrades)}
      />
      <Stat
        label={t("feesPaid")}
        value={fmtCompactUsd(stats.totalFeesSpent)}
        sub={t("feesPaidSub", { pct: fmtPct(stats.totalFeesSpent / (Math.abs(stats.totalPnl) + stats.totalFeesSpent || 1)) })}
        valueClass="text-amber-400 text-2xl font-mono font-semibold"
        exactTitle={fmtUsd(stats.totalFeesSpent)}
      />
      <Stat
        label={t("avgDuration")}
        value={fmtDuration(Math.round(stats.avgDurationSeconds))}
        sub={t("avgDurationSub", { winner: fmtDuration(Math.round(stats.avgWinnerDurationSeconds)), loser: fmtDuration(Math.round(stats.avgLoserDurationSeconds)) })}
      />
    </div>
  );
}
