import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RRInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtNumber, fmtCompact, pnlColor } from "@/lib/format";

interface Props {
  insight: RRInsight;
}

function Row({ label, value, valueClass, exactTitle }: { label: string; value: string; valueClass?: string; exactTitle?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-slate-800 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold ${valueClass ?? "text-slate-200"}`} title={exactTitle}>{value}</span>
    </div>
  );
}

export default function RRCard({ insight }: Props) {
  const t = useTranslations("Cards.RR");
  if (!insight) return null;

  const { avgWinnerPnl, avgLoserPnl, realizedRR, requiredRR, winRate, winnerCount, loserCount, isAboveBreakeven } = insight;

  const noData = winnerCount === 0 && loserCount === 0;
  const missingLosers = loserCount === 0;
  const missingWinners = winnerCount === 0;

  const rrDisplay = realizedRR != null && realizedRR > 0 ? `${fmtNumber(realizedRR)}R` : "—";
  const reqDisplay = requiredRR > 0 ? `${fmtNumber(requiredRR)}R` : "—";

  let insightText: string | null = null;
  if (!noData && !missingLosers && !missingWinners) {
    const diff = (realizedRR ?? 0) - requiredRR;
    if (isAboveBreakeven) {
      insightText = t("insightAbove", { rr: fmtNumber(realizedRR), wr: fmtPct(winRate) });
    } else {
      insightText = t("insightBelow", {
        wr: fmtPct(winRate),
        needed: fmtNumber(requiredRR),
        actual: fmtNumber(realizedRR),
        diff: fmtNumber(Math.abs(diff)),
      });
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        {noData ? (
          <p className="text-xs text-slate-500">{t("notEnough")}</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 pb-1">
              <span
                className={`text-3xl font-mono font-bold ${
                  realizedRR != null && realizedRR > 0
                    ? pnlColor(isAboveBreakeven ? 1 : -1)
                    : "text-slate-500"
                }`}
              >
                {rrDisplay}
              </span>
              {requiredRR > 0 && (
                <span className="text-xs text-slate-500">
                  {t("threshold", { req: reqDisplay })}
                </span>
              )}
            </div>

            <Row
              label={t("avgWin", { n: winnerCount })}
              value={missingWinners ? "—" : fmtCompact(avgWinnerPnl)}
              valueClass="text-emerald-400"
              exactTitle={missingWinners ? undefined : fmtPnl(avgWinnerPnl)}
            />
            <Row
              label={t("avgLoss", { n: loserCount })}
              value={missingLosers ? "—" : fmtCompact(-avgLoserPnl)}
              valueClass="text-red-400"
              exactTitle={missingLosers ? undefined : fmtPnl(-avgLoserPnl)}
            />
            <Row
              label={t("requiredRR")}
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
