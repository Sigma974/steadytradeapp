"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EquityInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtCompact, fmtCompactUsd, fmtUsd } from "@/lib/format";

interface Props {
  insight: EquityInsight;
}

function fmtDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function insightKey(pct: number): string {
  if (pct < 0.10) return "insightExcellent";
  if (pct < 0.20) return "insightModerate";
  if (pct < 0.30) return "insightHigh";
  return "insightSevere";
}

function insightColor(pct: number): string {
  if (pct < 0.10) return "text-emerald-400";
  if (pct < 0.20) return "text-yellow-400";
  if (pct < 0.30) return "text-orange-400";
  return "text-red-400";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between text-xs py-2 border-t border-slate-800 gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default function DrawdownCard({ insight }: Props) {
  const t = useTranslations("Cards.Drawdown");
  const locale = useLocale();

  if (!insight || insight.points.length < 3) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-600">{t("notEnough")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!insight.maxDrawdown) {
    const isExceptional = insight.finalEquity > 0;
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className={`text-sm font-medium leading-snug ${isExceptional ? "text-emerald-400" : "text-slate-400"}`}>
            {isExceptional ? t("noDrawdown") : t("noMajorDrawdown")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { maxDrawdown } = insight;
  const key = insightKey(maxDrawdown.pct);
  const color = insightColor(maxDrawdown.pct);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">

        {/* Hero number */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-mono font-bold text-red-400">
            -{fmtPct(maxDrawdown.pct)}
          </span>
          <span
            className="text-sm font-mono text-red-400/70"
            title={`-${fmtUsd(maxDrawdown.amountUsd)}`}
          >
            -{fmtCompactUsd(maxDrawdown.amountUsd)}
          </span>
        </div>

        {/* Detail rows */}
        <div>
          <Row label={t("peak")}>
            <span
              className="text-slate-300 font-mono"
              title={fmtPnl(maxDrawdown.peakEquity)}
            >
              {fmtCompact(maxDrawdown.peakEquity)}
            </span>
            <span className="text-slate-500 block">{fmtDate(maxDrawdown.peakDate, locale)}</span>
          </Row>
          <Row label={t("bottom")}>
            <span
              className="text-red-400 font-mono"
              title={fmtPnl(maxDrawdown.troughEquity)}
            >
              {fmtCompact(maxDrawdown.troughEquity)}
            </span>
            <span className="text-slate-500 block">{fmtDate(maxDrawdown.troughDate, locale)}</span>
          </Row>
          <Row label={t("recoveryTime")}>
            {maxDrawdown.recoveryDays !== null ? (
              <span className="text-slate-300 font-mono">
                {(() => {
                  const d = Math.round(maxDrawdown.recoveryDays!);
                  if (d < 1) return t("lessThanOneDay");
                  if (d >= 30) return t("months", { n: Math.round(d / 30) });
                  return t("days", { n: d });
                })()}
              </span>
            ) : (
              <span className="text-slate-500 italic">{t("notYetRecovered")}</span>
            )}
          </Row>
        </div>

        {/* Insight text */}
        <p className={`text-xs font-medium pt-1 ${color}`}>{t(key)}</p>
      </CardContent>
    </Card>
  );
}
