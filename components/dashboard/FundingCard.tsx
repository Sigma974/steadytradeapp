import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FundingInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, fmtCompact, fmtCompactUsd, pnlColor } from "@/lib/format";

interface Props {
  insight: FundingInsight;
}

export default function FundingCard({ insight }: Props) {
  const t = useTranslations("Cards.Funding");
  if (!insight) return null;
  const { totalFunding, totalPaid, totalReceived, paymentCount, byCoin, fundingVsNetPnl } = insight;

  const isNetPayer = totalFunding < 0;
  const isNetReceiver = totalFunding > 0;
  const top5 = byCoin.slice(0, 5);
  const maxAbs = Math.max(...top5.map((c) => Math.abs(c.total)), 1);

  const insightLine = (() => {
    if (paymentCount === 0) return t("insightNoFees");
    if (isNetPayer) {
      if (fundingVsNetPnl !== null) {
        return t("insightPayer", { amount: fmtCompactUsd(totalPaid), pct: fmtPct(Math.abs(fundingVsNetPnl)) });
      }
      return t("insightPayerNoPct", { amount: fmtCompactUsd(totalPaid) });
    }
    if (isNetReceiver) {
      return t("insightReceiver", { amount: fmtCompactUsd(totalReceived) });
    }
    return t("insightNeutral");
  })();

  if (insight.rateLimited) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-amber-500">{t("rateLimited")}</p>
        </CardContent>
      </Card>
    );
  }

  if (paymentCount === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">
            {t("title")}
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
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <span
            className={`text-3xl font-mono font-bold ${pnlColor(totalFunding)}`}
            title={fmtPnl(totalFunding)}
          >
            {fmtCompact(totalFunding)}
          </span>
          <div className="text-xs text-slate-500 leading-tight">
            {t("netFunding")}<br />
            {paymentCount} {t("payments")}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{insightLine}</p>

        {totalPaid > 0 && totalReceived > 0 && (
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-slate-500">{t("paid")}</span>{" "}
              <span className="text-red-400 font-mono" title={fmtPnl(-totalPaid)}>
                {fmtCompact(-totalPaid)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">{t("received")}</span>{" "}
              <span className="text-emerald-400 font-mono" title={fmtPnl(totalReceived)}>
                {fmtCompact(totalReceived)}
              </span>
            </div>
          </div>
        )}

        {top5.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t("byCoin")}</p>
            {top5.map((c) => {
              const barWidth = (Math.abs(c.total) / maxAbs) * 100;
              return (
                <div key={c.coin} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-mono">{c.coin}</span>
                    <span className={`font-mono ${pnlColor(c.total)}`} title={fmtPnl(c.total)}>
                      {fmtCompact(c.total)}
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
