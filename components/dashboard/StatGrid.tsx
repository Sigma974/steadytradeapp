import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralStats } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtDuration, fmtUsd, fmtNumber, pnlColor } from "@/lib/format";

interface Props {
  stats: GeneralStats;
}

function Stat({ label, value, sub, valueClass }: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-2xl font-mono font-semibold ${valueClass ?? "text-slate-100"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function StatGrid({ stats }: Props) {
  const pfDisplay =
    stats.profitFactor === Infinity
      ? "∞"
      : fmtNumber(stats.profitFactor);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat
        label="Total P&L"
        value={fmtPnl(stats.totalPnl)}
        sub={`avg ${fmtPnl(stats.avgPnl)} / trade`}
        valueClass={pnlColor(stats.totalPnl) + " text-2xl font-mono font-semibold"}
      />
      <Stat
        label="Win Rate"
        value={fmtPct(stats.winRate)}
        sub={`${stats.winners}W / ${stats.losers}L`}
        valueClass={pnlColor(stats.winRate - 0.5) + " text-2xl font-mono font-semibold"}
      />
      <Stat
        label="Profit Factor"
        value={pfDisplay}
        sub="gross wins / gross losses"
        valueClass={pnlColor(stats.profitFactor - 1) + " text-2xl font-mono font-semibold"}
      />
      <Stat
        label="Total Trades"
        value={String(stats.totalTrades)}
        sub={`avg ${fmtDuration(Math.round(stats.avgDurationSeconds))} / trade`}
      />
      <Stat
        label="Fees Paid"
        value={fmtUsd(stats.totalFeesSpent)}
        sub={`${fmtPct(stats.totalFeesSpent / (Math.abs(stats.totalPnl) + stats.totalFeesSpent || 1))} of gross`}
        valueClass="text-amber-400 text-2xl font-mono font-semibold"
      />
      <Stat
        label="Avg Duration"
        value={fmtDuration(Math.round(stats.avgDurationSeconds))}
        sub={`W: ${fmtDuration(Math.round(stats.avgWinnerDurationSeconds))} · L: ${fmtDuration(Math.round(stats.avgLoserDurationSeconds))}`}
      />
    </div>
  );
}
