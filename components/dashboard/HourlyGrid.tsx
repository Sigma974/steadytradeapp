import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HourlyPerformanceInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtCompact } from "@/lib/format";

interface Props {
  insight: HourlyPerformanceInsight;
}

function cellColor(pnl: number, maxAbs: number): string {
  if (maxAbs === 0) return "hsl(215 28% 11%)";
  const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
  const lightness = 8 + intensity * 28;
  return pnl >= 0
    ? `hsl(152 60% ${lightness}%)`
    : `hsl(0 72% ${lightness}%)`;
}

function textColor(pnl: number, tradeCount: number): string {
  if (tradeCount === 0) return "text-slate-700";
  return pnl >= 0 ? "text-emerald-300" : "text-red-300";
}

export default function HourlyGrid({ insight }: Props) {
  const t = useTranslations("Cards.Hourly");
  const active = insight.byHour.filter((s) => s.tradeCount > 0);
  const maxAbs = active.length
    ? Math.max(...active.map((s) => Math.abs(s.totalPnl)))
    : 0;

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200 flex items-center justify-between">
          {t("title")}
          <span className="text-xs font-normal text-slate-500">
            {insight.bestHour && insight.worstHour && t("bestWorstHeader", { bestH: insight.bestHour.hour, worstH: insight.worstHour.hour })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-8 gap-1">
          {insight.byHour.map((slot) => (
            <div
              key={slot.hour}
              className="rounded p-1.5 flex flex-col items-center gap-0.5 min-h-[52px] transition-colors"
              style={{ backgroundColor: cellColor(slot.totalPnl, maxAbs) }}
              title={
                slot.tradeCount > 0
                  ? `${slot.hour}:00 UTC — ${slot.tradeCount} trades · ${fmtPnl(slot.totalPnl)} · ${fmtPct(slot.winRate)} WR`
                  : `${slot.hour}:00 UTC — ${t("noTradesSlot")}`
              }
            >
              <span className="text-[10px] text-slate-500 leading-none">{slot.hour}h</span>
              {slot.tradeCount > 0 ? (
                <>
                  <span className={`text-[10px] font-mono font-medium leading-none ${textColor(slot.totalPnl, slot.tradeCount)}`}>
                    {fmtCompact(slot.totalPnl).replace("+", "").replace("$", "")}
                  </span>
                  <span className="text-[9px] text-slate-500 leading-none">{slot.tradeCount}t</span>
                </>
              ) : (
                <span className="text-[9px] text-slate-800 leading-none">–</span>
              )}
            </div>
          ))}
        </div>

        {active.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-emerald-700" /> {t("profitable")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-red-800" /> {t("losing")}
              </span>
            </div>
            {insight.bestHour && (
              <span>
                {t("bestWorstLine", { best: fmtCompact(insight.bestHour.totalPnl), worst: fmtCompact(insight.worstHour!.totalPnl) })}
              </span>
            )}
          </div>
        )}

        {active.length === 0 && (
          <p className="text-xs text-slate-500 mt-2">{t("noTradesPeriod")}</p>
        )}
      </CardContent>
    </Card>
  );
}
