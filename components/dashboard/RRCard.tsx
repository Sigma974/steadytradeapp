import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RRInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtNumber, pnlColor } from "@/lib/format";

interface Props {
  insight: RRInsight;
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-slate-800 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold ${valueClass ?? "text-slate-200"}`}>{value}</span>
    </div>
  );
}

export default function RRCard({ insight }: Props) {
  if (!insight) return null;

  const { avgWinnerPnl, avgLoserPnl, realizedRR, requiredRR, winRate, winnerCount, loserCount, isAboveBreakeven } = insight;

  const noData = winnerCount === 0 && loserCount === 0;
  const missingLosers = loserCount === 0;
  const missingWinners = winnerCount === 0;

  const rrDisplay = realizedRR > 0 ? `${fmtNumber(realizedRR)}R` : "—";
  const reqDisplay = requiredRR > 0 ? `${fmtNumber(requiredRR)}R` : "—";

  let insightText: string | null = null;
  if (!noData && !missingLosers && !missingWinners) {
    const diff = realizedRR - requiredRR;
    if (isAboveBreakeven) {
      insightText = `Ton RR de ${fmtNumber(realizedRR)}R couvre ton WR de ${fmtPct(winRate)}. Tu es mathématiquement au-dessus du seuil de rentabilité.`;
    } else {
      const neededStr = fmtNumber(requiredRR);
      insightText = `Pour être rentable à ${fmtPct(winRate)} WR, il te faudrait ${neededStr}R. Tu réalises ${fmtNumber(realizedRR)}R — ${fmtNumber(Math.abs(diff))}R de manque.`;
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          Risk / Reward moyen
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        {noData ? (
          <p className="text-xs text-slate-500">Pas assez de trades.</p>
        ) : (
          <>
            {/* Big RR number */}
            <div className="flex items-baseline gap-2 pb-1">
              <span
                className={`text-3xl font-mono font-bold ${
                  realizedRR > 0
                    ? pnlColor(isAboveBreakeven ? 1 : -1)
                    : "text-slate-500"
                }`}
              >
                {rrDisplay}
              </span>
              {requiredRR > 0 && (
                <span className="text-xs text-slate-500">
                  seuil&nbsp;{reqDisplay}
                </span>
              )}
            </div>

            <Row
              label={`Gain moyen (${winnerCount} winners)`}
              value={missingWinners ? "—" : fmtPnl(avgWinnerPnl)}
              valueClass="text-emerald-400"
            />
            <Row
              label={`Perte moyenne (${loserCount} losers)`}
              value={missingLosers ? "—" : fmtPnl(-avgLoserPnl)}
              valueClass="text-red-400"
            />
            <Row
              label="RR requis au WR actuel"
              value={reqDisplay}
              valueClass="text-slate-400"
            />

            {insightText && (
              <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                {insightText}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
