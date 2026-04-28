import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeverageInsight } from "@/lib/api-types";
import { fmtPct, fmtPnl, pnlColor } from "@/lib/format";

interface Props {
  insight: LeverageInsight;
}

export default function LeverageCard({ insight }: Props) {
  if (!insight) return null;
  const { buckets, bestBucket, worstBucket } = insight;

  if (buckets.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            Taille de position
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-500">Pas assez de données.</p>
        </CardContent>
      </Card>
    );
  }

  // Scale bar widths to the bucket with the highest |totalPnl|
  const maxAbsPnl = Math.max(...buckets.map((b) => Math.abs(b.totalPnl)), 1);

  const bestLabel = bestBucket?.label;
  const worstLabel = worstBucket?.label;
  const onlyOneBucket = buckets.length === 1;

  const insightLine = (() => {
    if (onlyOneBucket) return null;
    if (!bestBucket || !worstBucket || bestBucket.label === worstBucket.label)
      return null;
    return (
      <>
        Positions{" "}
        <span className="text-emerald-400 font-medium">{bestLabel}</span> :{" "}
        <span className="text-emerald-400">{fmtPct(bestBucket.winRate)} WR</span>,{" "}
        <span className="text-emerald-400">{fmtPnl(bestBucket.totalPnl)}</span>. Positions{" "}
        <span className="text-red-400 font-medium">{worstLabel}</span> :{" "}
        <span className="text-red-400">{fmtPct(worstBucket.winRate)} WR</span>,{" "}
        <span className="text-red-400">{fmtPnl(worstBucket.totalPnl)}</span>.
      </>
    );
  })();

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          Taille de position
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Insight text */}
        {insightLine && (
          <p className="text-xs text-slate-300 leading-relaxed">{insightLine}</p>
        )}

        {/* Bucket bars */}
        <div className="space-y-2.5">
          {buckets.map((bucket) => {
            const barWidth = (Math.abs(bucket.totalPnl) / maxAbsPnl) * 100;
            const isPositive = bucket.totalPnl >= 0;
            const isBest = bucket.label === bestLabel && !onlyOneBucket;
            const isWorst = bucket.label === worstLabel && !onlyOneBucket;

            return (
              <div key={bucket.label} className="space-y-1">
                {/* Label row */}
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
                      {bucket.label}
                    </span>
                    <span className="text-slate-600">
                      {bucket.count} trades · {fmtPct(bucket.winRate)} WR
                    </span>
                  </div>
                  <span className={`font-mono ${pnlColor(bucket.totalPnl)}`}>
                    {fmtPnl(bucket.totalPnl)}
                  </span>
                </div>

                {/* Bar */}
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

        {/* Footer note */}
        <p className="text-xs text-slate-600 pt-1">
          Classé par taille de position (notional USD). Le levier n'est pas disponible via l'API Hyperliquid.
        </p>
      </CardContent>
    </Card>
  );
}
