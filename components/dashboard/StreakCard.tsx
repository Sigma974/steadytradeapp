import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreakInsight } from "@/lib/api-types";
import { fmtPct, fmtPnl, fmtCompact, pnlColor } from "@/lib/format";

interface Props {
  insight: StreakInsight;
}

function WinRateBar({ label, rate, count }: { label: string; rate: number; count?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}{count !== undefined ? <span className="text-slate-600 ml-1">({count})</span> : null}</span>
        <span className={pnlColor(rate - 0.5)}>{fmtPct(rate)}</span>
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

export default function StreakCard({ insight }: Props) {
  const t = useTranslations("Cards.Streak");
  if (!insight) return null;
  const {
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    postStreakWinRate,
    postStreakCount,
    baselineWinRate,
    significantStreakCount,
  } = insight;

  const isOnLossStreak = currentStreak?.type === "loss" && currentStreak.length >= 3;
  const isOnWinStreak = currentStreak?.type === "win" && currentStreak.length >= 3;
  const hasStreak = currentStreak !== null;

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {hasStreak && (
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl font-mono font-bold ${
                currentStreak!.type === "loss" ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {currentStreak!.length}
            </span>
            <div className="text-xs text-slate-400 leading-tight">
              {currentStreak!.type === "loss" ? t("losses") : t("wins")} {t("consecutive")}
              <br />
              <span className="text-slate-500">{t("currentStreak")}</span>
            </div>
          </div>
        )}

        {(isOnLossStreak || isOnWinStreak) && (
          <p className="text-xs text-slate-300 leading-relaxed">
            {isOnLossStreak
              ? t("onLossStreak", { n: currentStreak!.length })
              : t("onWinStreak", { n: currentStreak!.length })}
            {postStreakCount > 0 && (
              <>
                {" "}{t("postStreakWR")}{" "}
                <span className={pnlColor(postStreakWinRate - baselineWinRate)}>
                  {fmtPct(postStreakWinRate)}
                </span>{" "}
                {t("vsBaseline", { baseline: fmtPct(baselineWinRate) })}
              </>
            )}
          </p>
        )}

        {significantStreakCount > 0 && postStreakCount > 0 && (
          <div className="space-y-2">
            <WinRateBar
              label={t("afterStreak")}
              rate={postStreakWinRate}
              count={postStreakCount}
            />
            <WinRateBar label={t("overallWR")} rate={baselineWinRate} />
          </div>
        )}

        <div className="space-y-0">
          {longestWinStreak && (
            <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800">
              <span className="text-slate-400">{t("longestWin")}</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono">
                  {longestWinStreak.length} {t("tradesUnit")}
                </span>
                <span className={`font-mono ${pnlColor(longestWinStreak.totalPnl)}`} title={fmtPnl(longestWinStreak.totalPnl)}>
                  {fmtCompact(longestWinStreak.totalPnl)}
                </span>
              </div>
            </div>
          )}
          {longestLossStreak && (
            <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800">
              <span className="text-slate-400">{t("longestLoss")}</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-mono">
                  {longestLossStreak.length} {t("tradesUnit")}
                </span>
                <span className={`font-mono ${pnlColor(longestLossStreak.totalPnl)}`} title={fmtPnl(longestLossStreak.totalPnl)}>
                  {fmtCompact(longestLossStreak.totalPnl)}
                </span>
              </div>
            </div>
          )}
          {!longestWinStreak && !longestLossStreak && (
            <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">
              {t("noStreakYet")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
