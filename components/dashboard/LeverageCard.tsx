import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeverageInsight } from "@/lib/api-types";
import { fmtPct, fmtPnl, fmtCompact, pnlColor } from "@/lib/format";

interface Props {
  insight: LeverageInsight;
}

export default function LeverageCard({ insight }: Props) {
  const t = useTranslations("Cards.Leverage");
  if (!insight) return null;
  const { buckets, bestBucket, worstBucket } = insight;

  const bucketLabels = {
    0: t("buckets.lt1k"),
    1000: t("buckets.1k5k"),
    5000: t("buckets.5k25k"),
    25000: t("buckets.25k100k"),
    100000: t("buckets.gt100k"),
  } as const;
  const bucketLabel = (minNotional: number): string =>
    bucketLabels[minNotional as keyof typeof bucketLabels] ?? String(minNotional);

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
  const bestMinNotional = bestBucket?.minNotional;
  const worstMinNotional = worstBucket?.minNotional;
  const onlyOneBucket = buckets.length === 1;

  const insightLine =
    !onlyOneBucket && bestBucket && worstBucket && bestBucket.minNotional !== worstBucket.minNotional
      ? t("insightLine", {
          best: bucketLabel(bestBucket.minNotional),
          bestWR: fmtPct(bestBucket.winRate),
          bestPnl: fmtCompact(bestBucket.totalPnl),
          worst: bucketLabel(worstBucket.minNotional),
          worstWR: fmtPct(worstBucket.winRate),
          worstPnl: fmtCompact(worstBucket.totalPnl),
        })
      : null;

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
            const isPositive = bucket.totalPnl >= 0;
            const isBest = bucket.minNotional === bestMinNotional && !onlyOneBucket;
            const isWorst = bucket.minNotional === worstMinNotional && !onlyOneBucket;

            return (
              <div key={bucket.minNotional} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        isBest
                          ? "text-emerald-400 font-medium"
                          : isWorst
                          ? "text-red-400 font-medium"
                          : "text-slate-400"
                      }
                    >
                      {bucketLabel(bucket.minNotional)}
                    </span>
                    <span className="text-slate-600">
                      {bucket.count} trades · {fmtPct(bucket.winRate)} WR
                    </span>
                  </div>
                  <span className={`font-mono ${pnlColor(bucket.totalPnl)}`} title={fmtPnl(bucket.totalPnl)}>
                    {fmtCompact(bucket.totalPnl)}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isPositive ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-600 pt-1">
          {t("footerNote")}
        </p>
      </CardContent>
    </Card>
  );
}
