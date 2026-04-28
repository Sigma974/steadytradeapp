import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentWinRateInsight } from "@/lib/api-types";
import { fmtPct, pnlColor } from "@/lib/format";

interface Props {
  insight: RecentWinRateInsight;
}

function WRBar({ label, rate, count }: { label: string; rate: number; count: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {label}
          <span className="text-slate-600 ml-1">({count} trades)</span>
        </span>
        <span className={`font-mono font-semibold ${pnlColor(rate - 0.5)}`}>
          {fmtPct(rate)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${rate >= 0.5 ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(rate * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function RecentWRCard({ insight }: Props) {
  if (!insight) return null;

  const {
    recentDays, recentCount, recentWinRate,
    totalCount, totalWinRate, delta,
    trend, hasEnoughHistory,
  } = insight;

  if (totalCount === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            Win rate récent
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-500">Pas assez de trades.</p>
        </CardContent>
      </Card>
    );
  }

  const trendLabel =
    trend === "improving" ? "↑ En progression" :
    trend === "declining" ? "↓ En baisse" :
    "→ Stable";

  const trendColor =
    trend === "improving" ? "text-emerald-400" :
    trend === "declining" ? "text-amber-400" :
    "text-slate-400";

  let insightText: string | null = null;
  if (hasEnoughHistory) {
    const diffStr = `${delta >= 0 ? "+" : ""}${fmtPct(delta)}`;
    if (trend === "declining") {
      insightText = `WR récent (${recentDays}j) : ${fmtPct(recentWinRate)}. Total : ${fmtPct(totalWinRate)}. Tendance baissière (${diffStr}), attention.`;
    } else if (trend === "improving") {
      insightText = `WR récent (${recentDays}j) : ${fmtPct(recentWinRate)}. Total : ${fmtPct(totalWinRate)}. En progression (${diffStr}).`;
    } else {
      insightText = `Win rate stable sur les ${recentDays} derniers jours.`;
    }
  } else {
    insightText = `Toutes les données sont dans la fenêtre de ${recentDays}j — pas assez d'historique pour détecter une tendance.`;
  }

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-200">
            Win rate récent
          </CardTitle>
          {hasEnoughHistory && (
            <span className={`text-xs font-semibold ${trendColor}`}>
              {trendLabel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <WRBar
          label={`${recentDays} derniers jours`}
          rate={recentWinRate}
          count={recentCount}
        />
        <WRBar
          label="Total période"
          rate={totalWinRate}
          count={totalCount}
        />

        {hasEnoughHistory && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
            <span className="text-slate-500">Variation</span>
            <span className={`font-mono font-semibold ${pnlColor(delta)}`}>
              {delta >= 0 ? "+" : ""}{fmtPct(delta)}
            </span>
          </div>
        )}

        {insightText && (
          <p className={`text-xs leading-relaxed ${hasEnoughHistory && trend !== "stable" ? trendColor : "text-slate-500"}`}>
            {insightText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
