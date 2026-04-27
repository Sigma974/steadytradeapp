import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BuyHoldInsight } from "@/lib/api-types";
import { fmtPnl, fmtNumber, pnlColor } from "@/lib/format";

interface Props {
  insight: BuyHoldInsight;
}

function DeltaBadge({ delta }: { delta: number }) {
  const label = delta >= 0 ? "▲ outperformed" : "▼ underperformed";
  return (
    <span className={`text-xs font-medium ${pnlColor(delta)}`}>
      {label} by {fmtPnl(Math.abs(delta))}
    </span>
  );
}

export default function BuyHoldTable({ insight }: Props) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200 flex flex-wrap items-center gap-3">
          Buy &amp; Hold vs Active Trading
          <DeltaBadge delta={insight.delta} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-slate-950 rounded-lg">
          <div>
            <p className="text-xs text-slate-500 mb-1">Active trading P&L</p>
            <p className={`text-xl font-mono font-bold ${pnlColor(insight.totalTradingPnl)}`}>
              {fmtPnl(insight.totalTradingPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Buy &amp; hold P&L</p>
            <p className={`text-xl font-mono font-bold ${pnlColor(insight.totalBuyHoldPnl)}`}>
              {fmtPnl(insight.totalBuyHoldPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Difference</p>
            <p className={`text-xl font-mono font-bold ${pnlColor(insight.delta)}`}>
              {fmtPnl(insight.delta)}
            </p>
          </div>
        </div>

        {/* Per-coin breakdown */}
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="text-left pb-2 font-medium">Coin</th>
              <th className="text-right pb-2 font-medium">Trading P&L</th>
              <th className="text-right pb-2 font-medium">Buy &amp; Hold</th>
              <th className="text-right pb-2 font-medium">Delta</th>
              <th className="text-right pb-2 font-medium hidden sm:table-cell">Entry → Exit</th>
            </tr>
          </thead>
          <tbody>
            {insight.byCoin.map((row) => (
              <tr key={row.coin} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-2 font-mono text-slate-200 font-medium">{row.coin}</td>
                <td className={`py-2 text-right font-mono ${pnlColor(row.tradingPnl)}`}>
                  {fmtPnl(row.tradingPnl)}
                </td>
                <td className={`py-2 text-right font-mono ${pnlColor(row.buyHoldPnl)}`}>
                  {fmtPnl(row.buyHoldPnl)}
                </td>
                <td className={`py-2 text-right font-mono font-semibold ${pnlColor(row.delta)}`}>
                  {fmtPnl(row.delta)}
                </td>
                <td className="py-2 text-right text-slate-500 hidden sm:table-cell">
                  {fmtNumber(row.firstEntryPx)} → {fmtNumber(row.lastExitPx)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] text-slate-600 mt-3">
          Buy &amp; hold assumes entering at your first trade's avg entry price and holding through your last exit, same size.
        </p>
      </CardContent>
    </Card>
  );
}
