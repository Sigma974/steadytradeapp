import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FundingInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, pnlColor } from "@/lib/format";

interface Props {
  insight: FundingInsight;
}

export default function FundingCard({ insight }: Props) {
  if (!insight) return null;
  const { totalFunding, totalPaid, totalReceived, paymentCount, byCoin, fundingVsNetPnl } = insight;

  const isNetPayer = totalFunding < 0;
  const isNetReceiver = totalFunding > 0;
  const top5 = byCoin.slice(0, 5);
  const maxAbs = Math.max(...top5.map((c) => Math.abs(c.total)), 1);

  const insightLine = (() => {
    if (paymentCount === 0) return "Aucun frais de funding sur la période.";
    if (isNetPayer) {
      const pct =
        fundingVsNetPnl !== null
          ? ` — représente ${fmtPct(Math.abs(fundingVsNetPnl))} de ton PnL net.`
          : ".";
      return `Tu as payé ${fmtPnl(-totalPaid)} de frais de funding${pct}`;
    }
    if (isNetReceiver) {
      return `Tu as reçu ${fmtPnl(totalReceived)} de funding net (tu portes des positions shorts prolongées).`;
    }
    return "Funding net nul sur la période.";
  })();

  if (paymentCount === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            Frais de funding
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-500">{insightLine}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          Frais de funding
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Big number */}
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-mono font-bold ${pnlColor(totalFunding)}`}>
            {fmtPnl(totalFunding)}
          </span>
          <div className="text-xs text-slate-500 leading-tight">
            net funding<br />
            {paymentCount} paiements
          </div>
        </div>

        {/* Insight text */}
        <p className="text-xs text-slate-300 leading-relaxed">{insightLine}</p>

        {/* Paid vs received split — only if both non-zero */}
        {totalPaid > 0 && totalReceived > 0 && (
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-slate-500">Payé</span>{" "}
              <span className="text-red-400 font-mono">{fmtPnl(-totalPaid)}</span>
            </div>
            <div>
              <span className="text-slate-500">Reçu</span>{" "}
              <span className="text-emerald-400 font-mono">{fmtPnl(totalReceived)}</span>
            </div>
          </div>
        )}

        {/* Per-coin breakdown */}
        {top5.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Par coin</p>
            {top5.map((c) => {
              const barWidth = (Math.abs(c.total) / maxAbs) * 100;
              return (
                <div key={c.coin} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-mono">{c.coin}</span>
                    <span className={`font-mono ${pnlColor(c.total)}`}>
                      {fmtPnl(c.total)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.total >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
