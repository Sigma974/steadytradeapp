import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreakInsight } from "@/lib/api-types";
import { fmtPct, fmtPnl, pnlColor } from "@/lib/format";

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
          Séries de trades
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Current streak */}
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
              {currentStreak!.type === "loss" ? "pertes" : "gains"} consécutifs
              <br />
              <span className="text-slate-500">série en cours</span>
            </div>
          </div>
        )}

        {/* Contextual insight text */}
        {(isOnLossStreak || isOnWinStreak) && (
          <p className="text-xs text-slate-300 leading-relaxed">
            {isOnLossStreak
              ? `Tu es sur une série de ${currentStreak!.length} trades perdants.`
              : `Tu es sur une série de ${currentStreak!.length} gains consécutifs.`}
            {postStreakCount > 0 && (
              <>
                {" "}Win rate sur le trade suivant ces séries :{" "}
                <span className={pnlColor(postStreakWinRate - baselineWinRate)}>
                  {fmtPct(postStreakWinRate)}
                </span>{" "}
                (vs {fmtPct(baselineWinRate)} baseline).
              </>
            )}
          </p>
        )}

        {/* Post-streak win rate vs baseline — only if we have enough data */}
        {significantStreakCount > 0 && postStreakCount > 0 && (
          <div className="space-y-2">
            <WinRateBar
              label="Après une série de 3+"
              rate={postStreakWinRate}
              count={postStreakCount}
            />
            <WinRateBar label="Win rate général" rate={baselineWinRate} />
          </div>
        )}

        {/* Longest streaks */}
        <div className="space-y-0">
          {longestWinStreak && (
            <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800">
              <span className="text-slate-400">Plus longue série de gains</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono">
                  {longestWinStreak.length} trades
                </span>
                <span className={`font-mono ${pnlColor(longestWinStreak.totalPnl)}`}>
                  {fmtPnl(longestWinStreak.totalPnl)}
                </span>
              </div>
            </div>
          )}
          {longestLossStreak && (
            <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800">
              <span className="text-slate-400">Plus longue série de pertes</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-mono">
                  {longestLossStreak.length} trades
                </span>
                <span className={`font-mono ${pnlColor(longestLossStreak.totalPnl)}`}>
                  {fmtPnl(longestLossStreak.totalPnl)}
                </span>
              </div>
            </div>
          )}
          {!longestWinStreak && !longestLossStreak && (
            <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">
              Pas encore de série de 3+ trades détectée.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
