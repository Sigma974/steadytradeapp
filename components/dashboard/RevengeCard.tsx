import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SerializedRevengeInsight } from "@/lib/api-types";
import { fmtPct, fmtDuration, fmtPnl, pnlColor } from "@/lib/format";

interface Props {
  insight: SerializedRevengeInsight;
}

function WinRateBar({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
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

export default function RevengeCard({ insight }: Props) {
  const top5 = insight.details.slice(0, 5);
  const hasRevenge = insight.revengeCount > 0;

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          Revenge Trades
          <Badge
            variant="outline"
            className={`text-xs ${hasRevenge ? "border-amber-500 text-amber-400" : "border-slate-600 text-slate-400"}`}
          >
            {insight.revengeCount} / {insight.totalTrades}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Rate */}
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-mono font-bold ${hasRevenge ? "text-amber-400" : "text-slate-400"}`}>
            {fmtPct(insight.revengeRate)}
          </span>
          <div className="text-xs text-slate-500 leading-tight">
            of trades opened within<br />
            {fmtDuration(insight.windowSeconds)} of a loss
          </div>
        </div>

        {/* Win rate comparison */}
        {hasRevenge && (
          <div className="space-y-2">
            <WinRateBar label="Revenge trades" rate={insight.revengeWinRate} />
            <WinRateBar label="Normal trades" rate={insight.normalWinRate} />
            {insight.avgGapSeconds > 0 && (
              <p className="text-xs text-slate-500 pt-1">
                Avg gap after a loss: {fmtDuration(Math.round(insight.avgGapSeconds))}
              </p>
            )}
          </div>
        )}

        {/* Top details */}
        {top5.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Recent</p>
            {top5.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-mono">{d.trade.coin}</span>
                  <span className="text-slate-500">{fmtDuration(Math.round(d.gapSeconds))} after loss</span>
                </div>
                <span className={`font-mono ${pnlColor(d.trade.pnlNet)}`}>
                  {fmtPnl(d.trade.pnlNet)}
                </span>
              </div>
            ))}
          </div>
        )}

        {!hasRevenge && (
          <p className="text-sm text-emerald-400">No revenge trades detected.</p>
        )}
      </CardContent>
    </Card>
  );
}
