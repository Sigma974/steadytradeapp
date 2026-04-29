import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BuyHoldInsight } from "@/lib/api-types";
import { fmtPnl, fmtNumber, fmtCompact, fmtCompactUsd, pnlColor } from "@/lib/format";

interface Props {
  insight: BuyHoldInsight;
}

function DeltaBadge({ delta }: { delta: number }) {
  const t = useTranslations("Cards.BuyHold");
  return (
    <span className={`text-xs font-medium ${pnlColor(delta)}`}>
      {t(delta >= 0 ? "outperformed" : "underperformed", { amount: fmtCompactUsd(Math.abs(delta)) })}
    </span>
  );
}

export default function BuyHoldTable({ insight }: Props) {
  const t = useTranslations("Cards.BuyHold");

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200 flex flex-wrap items-center gap-3">
          {t("title")}
          <DeltaBadge delta={insight.delta} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-slate-950 rounded-lg">
          <div>
            <p className="text-xs text-slate-500 mb-1">{t("tradingPnl")}</p>
            <p
              className={`text-xl font-mono font-bold ${pnlColor(insight.totalTradingPnl)}`}
              title={fmtPnl(insight.totalTradingPnl)}
            >
              {fmtCompact(insight.totalTradingPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">{t("buyHoldPnl")}</p>
            <p
              className={`text-xl font-mono font-bold ${pnlColor(insight.totalBuyHoldPnl)}`}
              title={fmtPnl(insight.totalBuyHoldPnl)}
            >
              {fmtCompact(insight.totalBuyHoldPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">{t("difference")}</p>
            <p
              className={`text-xl font-mono font-bold ${pnlColor(insight.delta)}`}
              title={fmtPnl(insight.delta)}
            >
              {fmtCompact(insight.delta)}
            </p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="text-left pb-2 font-medium">{t("colCoin")}</th>
              <th className="text-right pb-2 font-medium">{t("colTradingPnl")}</th>
              <th className="text-right pb-2 font-medium">{t("colBuyHold")}</th>
              <th className="text-right pb-2 font-medium">{t("colDelta")}</th>
              <th className="text-right pb-2 font-medium hidden sm:table-cell">{t("colEntryExit")}</th>
            </tr>
          </thead>
          <tbody>
            {insight.byCoin.map((row) => (
              <tr key={row.coin} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-2 font-mono text-slate-200 font-medium">{row.coin}</td>
                <td
                  className={`py-2 text-right font-mono ${pnlColor(row.tradingPnl)}`}
                  title={fmtPnl(row.tradingPnl)}
                >
                  {fmtCompact(row.tradingPnl)}
                </td>
                <td
                  className={`py-2 text-right font-mono ${pnlColor(row.buyHoldPnl)}`}
                  title={fmtPnl(row.buyHoldPnl)}
                >
                  {fmtCompact(row.buyHoldPnl)}
                </td>
                <td
                  className={`py-2 text-right font-mono font-semibold ${pnlColor(row.delta)}`}
                  title={fmtPnl(row.delta)}
                >
                  {fmtCompact(row.delta)}
                </td>
                <td className="py-2 text-right text-slate-500 hidden sm:table-cell">
                  {fmtNumber(row.firstEntryPx)} → {fmtNumber(row.lastExitPx)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] text-slate-600 mt-3">
          {t("footerNote")}
        </p>
      </CardContent>
    </Card>
  );
}
