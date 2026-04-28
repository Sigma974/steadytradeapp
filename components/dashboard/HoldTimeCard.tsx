import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HoldTimeInsight } from "@/lib/api-types";
import { fmtPct, fmtPnl, pnlColor } from "@/lib/format";

interface Props {
  insight: HoldTimeInsight;
}

export default function HoldTimeCard({ insight }: Props) {
  const t = useTranslations("Cards.HoldTime");
  if (!insight) return null;
  const { buckets, bestBucket, worstBucket } = insight;

  if (buckets.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-500">{t("notEnough")}</p>
        </CardContent>
      </Card>
    );
  }

  const maxAbsPnl = Math.max(...buckets.map((b) => Math.abs(b.totalPnl)), 1);
  const onlyOne = buckets.length === 1;
  const bestLabel = bestBucket?.label;
  const worstLabel = worstBucket?.label;

  const insightLine = (() => {
    if (onlyOne || !bestBucket || !worstBucket || bestLabel === worstLabel) return null;
    const bestProfit = bestBucket.totalPnl >= 0;
    const worstLoss = worstBucket.totalPnl < 0;
    let text = t("insightBest", { best: bestBucket.label, bestPnl: fmtPnl(bestBucket.totalPnl), bestWR: fmtPct(bestBucket.winRate) });
    if (bestProfit && worstLoss) {
      text += t("insightWorst", { worst: worstBucket.label, worstPnl: fmtPnl(worstBucket.totalPnl), worstWR: fmtPct(worstBucket.winRate) });
    }
    return text;
  })();

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {insightLine && (
          <p className="text-xs text-slate-300 leading-relaxed">{insightLine}</p>
        )}

        <div className="space-y-2.5">
          {buckets.map((bucket) => {
            const barWidth = (Math.abs(bucket.totalPnl) / maxAbsPnl) * 100;
            const isBest = bucket.label === bestLabel && !onlyOne;
            const isWorst = bucket.label === worstLabel && !onlyOne;

            return (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`shrink-0 font-mono ${
                        isBest
                          ? "text-emerald-400 font-medium"
                          : isWorst
                          ? "text-red-400 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {bucket.label}
                    </span>
                    <span className="text-slate-600 truncate">
                      {bucket.count} trades · {fmtPct(bucket.winRate)} WR
                      {bucket.expectancyR !== null && (
                        <> · <span className={pnlColor(bucket.expectancyR)}>{bucket.expectancyR >= 0 ? "+" : ""}{bucket.expectancyR.toFixed(2)}R</span></>
                      )}
                    </span>
                  </div>
                  <span className={`font-mono ml-2 shrink-0 ${pnlColor(bucket.totalPnl)}`}>
                    {fmtPnl(bucket.totalPnl)}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      bucket.totalPnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
