import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeekdayInsight } from "@/lib/api-types";
import { DISPLAY_ORDER } from "@/lib/insights/weekday";
import { fmtPct, fmtPnl, pnlColor } from "@/lib/format";

interface Props {
  insight: WeekdayInsight;
}

export default function WeekdayCard({ insight }: Props) {
  if (!insight) return null;
  const { byDay, bestDay, worstDay, weekendPctTrades, weekendTotalPnl, totalPnl } = insight;

  const activeDays = byDay.filter((d) => d.count > 0);
  if (activeDays.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            Jour de la semaine
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-500">Pas assez de données.</p>
        </CardContent>
      </Card>
    );
  }

  const maxAbsPnl = Math.max(...activeDays.map((d) => Math.abs(d.totalPnl)), 1);

  // Weekend insight line
  const weekendPctPnl =
    totalPnl !== 0 ? Math.abs(weekendTotalPnl / totalPnl) : null;

  const hasWeekendTrades = weekendPctTrades > 0;

  const insightLine = (() => {
    if (!bestDay || !worstDay || bestDay.day === worstDay.day) return null;
    return (
      <>
        <span className="text-emerald-400 font-medium">{bestDay.dayName}</span>{" "}
        <span className="text-emerald-400">{fmtPnl(bestDay.totalPnl)}</span>{" "}
        ({fmtPct(bestDay.winRate)} WR) ·{" "}
        <span className="text-red-400 font-medium">{worstDay.dayName}</span>{" "}
        <span className="text-red-400">{fmtPnl(worstDay.totalPnl)}</span>{" "}
        ({fmtPct(worstDay.winRate)} WR).
      </>
    );
  })();

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">
          Jour de la semaine
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Insight text */}
        {insightLine && (
          <p className="text-xs text-slate-300 leading-relaxed">{insightLine}</p>
        )}

        {/* Day bars */}
        <div className="space-y-2">
          {DISPLAY_ORDER.map((day) => {
            const slot = byDay[day];
            const isEmpty = slot.count === 0;
            const barWidth = isEmpty
              ? 0
              : (Math.abs(slot.totalPnl) / maxAbsPnl) * 100;
            const isBest = bestDay?.day === day;
            const isWorst = worstDay?.day === day;

            return (
              <div key={day} className="flex items-center gap-2">
                {/* Day label */}
                <span
                  className={`w-16 text-xs shrink-0 ${
                    isEmpty
                      ? "text-slate-700"
                      : isBest
                      ? "text-emerald-400 font-medium"
                      : isWorst
                      ? "text-red-400 font-medium"
                      : "text-slate-400"
                  }`}
                >
                  {slot.dayName.slice(0, 3)}
                </span>

                {/* Bar */}
                <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden relative">
                  <div
                    className={`h-full rounded transition-all ${
                      slot.totalPnl >= 0 ? "bg-emerald-600" : "bg-red-700"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                  {!isEmpty && (
                    <span className="absolute inset-0 flex items-center px-2 text-xs text-slate-300">
                      {slot.count} trades · {fmtPct(slot.winRate)} WR
                    </span>
                  )}
                </div>

                {/* PnL */}
                <span
                  className={`w-20 text-right text-xs font-mono shrink-0 ${
                    isEmpty ? "text-slate-700" : pnlColor(slot.totalPnl)
                  }`}
                >
                  {isEmpty ? "—" : fmtPnl(slot.totalPnl)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Weekend callout */}
        {hasWeekendTrades && (
          <p className="text-xs text-slate-500 border-t border-slate-800 pt-3">
            Weekend (sam+dim) :{" "}
            <span className="text-slate-400">
              {fmtPct(weekendPctTrades)} du volume
            </span>
            {weekendPctPnl !== null && totalPnl !== 0 && (
              <>
                {" "}· {fmtPct(weekendPctPnl)} du{" "}
                {totalPnl > 0 ? "PnL total" : "PnL négatif"} (
                <span className={pnlColor(weekendTotalPnl)}>
                  {fmtPnl(weekendTotalPnl)}
                </span>
                )
              </>
            )}
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
