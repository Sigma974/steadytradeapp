import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeekdayInsight } from "@/lib/api-types";
import { DISPLAY_ORDER } from "@/lib/insights/weekday";
import { fmtPct, fmtPnl, fmtCompact, pnlColor } from "@/lib/format";

interface Props {
  insight: WeekdayInsight;
}

export default function WeekdayCard({ insight }: Props) {
  const t = useTranslations("Cards.Weekday");
  const locale = useLocale();

  const dayShort = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(Date.UTC(2025, 0, 5 + day)));
  const dayLong = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(Date.UTC(2025, 0, 5 + day)));

  if (!insight) return null;
  const { byDay, bestDay, worstDay, weekendPctTrades, weekendTotalPnl, totalPnl } = insight;

  const activeDays = byDay.filter((d) => d.count > 0);
  if (activeDays.length === 0) {
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

  const maxAbsPnl = Math.max(...activeDays.map((d) => Math.abs(d.totalPnl)), 1);

  const weekendPctPnl =
    totalPnl !== 0 ? Math.abs(weekendTotalPnl / totalPnl) : null;

  const hasWeekendTrades = weekendPctTrades > 0;

  const insightLine =
    bestDay && worstDay && bestDay.day !== worstDay.day
      ? t("insightLine", {
          bestDay: dayLong(bestDay.day),
          bestPnl: fmtCompact(bestDay.totalPnl),
          bestWR: fmtPct(bestDay.winRate),
          worstDay: dayLong(worstDay.day),
          worstPnl: fmtCompact(worstDay.totalPnl),
          worstWR: fmtPct(worstDay.winRate),
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
                  {dayShort(day)}
                </span>

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

                <span
                  className={`w-20 text-right text-xs font-mono shrink-0 ${
                    isEmpty ? "text-slate-700" : pnlColor(slot.totalPnl)
                  }`}
                >
                  {isEmpty ? "—" : <span title={fmtPnl(slot.totalPnl)}>{fmtCompact(slot.totalPnl)}</span>}
                </span>
              </div>
            );
          })}
        </div>

        {hasWeekendTrades && (
          <p className="text-xs text-slate-500 border-t border-slate-800 pt-3">
            {t("weekendLine", { pct: fmtPct(weekendPctTrades) })}
            {weekendPctPnl !== null && totalPnl !== 0 && (
              <>
                {" "}· {fmtPct(weekendPctPnl)}{" "}
                {totalPnl > 0 ? t("ofTotalPnl") : t("ofNegativePnl")} (
                <span className={pnlColor(weekendTotalPnl)} title={fmtPnl(weekendTotalPnl)}>
                  {fmtCompact(weekendTotalPnl)}
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
