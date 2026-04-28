import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TPSLInsight } from "@/lib/api-types";

interface Props {
  insight: TPSLInsight;
}

function pct(n: number) {
  return (n * 100).toFixed(2) + "%";
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function TPSLCard({ insight }: Props) {
  if (!insight) return null;

  const { avgWinnerExitPct, avgLoserExitPct, winnerCount, loserCount, isInverted } = insight;
  const noData = winnerCount === 0 && loserCount === 0;
  const maxPct = Math.max(avgWinnerExitPct, avgLoserExitPct);

  let insightText: string | null = null;
  if (winnerCount > 0 && loserCount > 0) {
    if (isInverted) {
      insightText = `Tu coupes tes losers (${pct(avgLoserExitPct)}) plus tard que tu prends tes winners (${pct(avgWinnerExitPct)}). C'est l'inverse de ce qu'il faudrait.`;
    } else {
      insightText = `Tu laisses courir tes winners (${pct(avgWinnerExitPct)}) plus loin que tes losers (${pct(avgLoserExitPct)}). Bonne discipline de sortie.`;
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          TP / SL implicites
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {noData ? (
          <p className="text-xs text-slate-500">Pas assez de trades.</p>
        ) : (
          <>
            {/* Winners */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  TP moyen
                  {winnerCount > 0 && (
                    <span className="text-slate-600 ml-1">({winnerCount} winners)</span>
                  )}
                </span>
                <span className="font-mono font-semibold text-emerald-400">
                  {winnerCount > 0 ? `+${pct(avgWinnerExitPct)}` : "—"}
                </span>
              </div>
              <Bar value={avgWinnerExitPct} max={maxPct} color="bg-emerald-500" />
            </div>

            {/* Losers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  SL moyen
                  {loserCount > 0 && (
                    <span className="text-slate-600 ml-1">({loserCount} losers)</span>
                  )}
                </span>
                <span className="font-mono font-semibold text-red-400">
                  {loserCount > 0 ? `-${pct(avgLoserExitPct)}` : "—"}
                </span>
              </div>
              <Bar
                value={avgLoserExitPct}
                max={maxPct}
                color={isInverted ? "bg-red-500" : "bg-slate-600"}
              />
            </div>

            {insightText && (
              <p
                className={`text-xs leading-relaxed pt-1 border-t border-slate-800 ${
                  isInverted ? "text-amber-400" : "text-slate-300"
                }`}
              >
                {insightText}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
