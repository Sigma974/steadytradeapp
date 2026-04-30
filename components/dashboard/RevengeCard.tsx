import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SerializedRevengeInsight } from "@/lib/api-types";
import { fmtPct, fmtDuration, fmtPnl, fmtCompact, pnlColor } from "@/lib/format";

interface Props {
  insight: SerializedRevengeInsight;
}

function WinRateBar({ label, rate, barColor }: { label: string; rate: number; barColor?: string }) {
  const color = barColor ?? (rate >= 0.5 ? "bg-emerald-500" : "bg-red-500");
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={pnlColor(rate - 0.5)}>{fmtPct(rate)}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(rate * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function RevengeCard({ insight }: Props) {
  const t = useTranslations("Cards.Revenge");
  const top5 = [...insight.details]
    .sort((a, b) => b.trade.openAt.localeCompare(a.trade.openAt))
    .slice(0, 5);
  const hasRevenge = insight.revengeCount > 0;

  const diff = insight.normalWinRate - insight.revengeWinRate;

  const revengeBarColor = diff > 0.10
    ? "bg-red-500"
    : insight.revengeWinRate >= insight.normalWinRate
      ? "bg-emerald-500"
      : "bg-amber-500";

  const insightText = (() => {
    if (insight.revengeCount < 3) return null;
    if (diff > 0.10) return t("insightWorse", { diff: Math.round(diff * 100) });
    if (insight.revengeWinRate >= insight.normalWinRate) return t("insightSurprising");
    return t("insightSlightlyWorse");
  })();

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          {t("title")}
          <Badge
            variant="outline"
            className={`text-xs ${hasRevenge ? "border-amber-500 text-amber-400" : "border-slate-600 text-slate-400"}`}
          >
            {insight.revengeCount} / {insight.totalTrades}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-mono font-bold ${hasRevenge ? "text-amber-400" : "text-slate-400"}`}>
            {fmtPct(insight.revengeRate)}
          </span>
          <div className="text-xs text-slate-500 leading-tight">
            {t("ofTradesOpenedWithin")}<br />
            {fmtDuration(insight.windowSeconds)} {t("ofALoss")}
          </div>
        </div>

        {hasRevenge && (
          <div className="space-y-2">
            <WinRateBar label={t("revengeLabel")} rate={insight.revengeWinRate} barColor={revengeBarColor} />
            <WinRateBar label={t("normalLabel")} rate={insight.normalWinRate} />
            {insightText && (
              <p className="text-xs text-slate-400 italic leading-relaxed pt-1">{insightText}</p>
            )}
            {insight.avgGapSeconds > 0 && (
              <p className="text-xs text-slate-500 pt-1">
                {t("avgGap", { duration: fmtDuration(Math.round(insight.avgGapSeconds)) })}
              </p>
            )}
          </div>
        )}

        {top5.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t("recentLabel")}</p>
            {top5.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-mono">{d.trade.coin}</span>
                  <span className="text-slate-500">{t("afterLoss", { duration: fmtDuration(Math.round(d.gapSeconds)) })}</span>
                </div>
                <span className={`font-mono ${pnlColor(d.trade.pnlNet)}`} title={fmtPnl(d.trade.pnlNet)}>
                  {fmtCompact(d.trade.pnlNet)}
                </span>
              </div>
            ))}
          </div>
        )}

        {!hasRevenge && (
          <p className="text-sm text-emerald-400">{t("noRevenge")}</p>
        )}
      </CardContent>
    </Card>
  );
}
