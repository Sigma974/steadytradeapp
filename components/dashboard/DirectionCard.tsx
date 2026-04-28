import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DirectionWinRateInsight } from "@/lib/api-types";
import { fmtPct, fmtPnl, pnlColor } from "@/lib/format";

interface Props {
  insight: DirectionWinRateInsight;
}

function DirectionRow({
  label,
  stat,
  highlight,
  noDataLabel,
}: {
  label: string;
  stat: { trades: number; winners: number; winRate: number; totalPnl: number };
  highlight: boolean;
  noDataLabel: string;
}) {
  const hasData = stat.trades > 0;
  return (
    <div
      className={`rounded-lg px-3 py-2.5 space-y-1.5 ${
        highlight ? "bg-slate-800" : "bg-slate-800/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            label === "Long" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {label}
        </span>
        {hasData ? (
          <span
            className={`text-sm font-mono font-bold ${pnlColor(stat.winRate - 0.5)}`}
          >
            {fmtPct(stat.winRate)}
          </span>
        ) : (
          <span className="text-xs text-slate-600">{noDataLabel}</span>
        )}
      </div>

      {hasData && (
        <>
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                stat.winRate >= 0.5 ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(stat.winRate * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {stat.winners}W&nbsp;/&nbsp;{stat.trades - stat.winners}L&nbsp;·&nbsp;{stat.trades} trades
            </span>
            <span className={pnlColor(stat.totalPnl)}>{fmtPnl(stat.totalPnl)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function DirectionCard({ insight }: Props) {
  const t = useTranslations("Cards.Direction");
  if (!insight) return null;
  const { long, short, delta, dominantDirection, significantDiff } = insight;

  const noData = long.trades === 0 && short.trades === 0;

  let insightText: string | null = null;
  if (significantDiff && dominantDirection) {
    const better = dominantDirection === "long" ? long : short;
    const worse = dominantDirection === "long" ? short : long;
    const diffPct = (Math.abs(delta) * 100).toFixed(0);
    if (worse.trades >= 5) {
      insightText = t("insightSignificant", {
        direction: dominantDirection,
        diff: diffPct,
        other: dominantDirection === "long" ? "short" : "long",
      });
    } else {
      insightText = t("insightBetter", {
        direction: dominantDirection,
        betterWR: fmtPct(better.winRate),
        worseWR: fmtPct(worse.winRate),
      });
    }
  } else if (long.trades >= 5 && short.trades >= 5) {
    insightText = t("insightSimilar");
  }

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {noData ? (
          <p className="text-xs text-slate-500">{t("notEnough")}</p>
        ) : (
          <>
            <DirectionRow
              label="Long"
              stat={long}
              highlight={dominantDirection === "long"}
              noDataLabel={t("noData")}
            />
            <DirectionRow
              label="Short"
              stat={short}
              highlight={dominantDirection === "short"}
              noDataLabel={t("noData")}
            />
            {insightText && (
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {insightText}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
