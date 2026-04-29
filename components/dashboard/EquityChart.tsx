"use client";

import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { EquityInsight } from "@/lib/api-types";
import { fmtPnl, fmtPct, pnlColor } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  insight: EquityInsight;
}

function fmtY(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function getXTicks(n: number): number[] {
  if (n <= 6) return Array.from({ length: n }, (_, i) => i + 1);
  const step = Math.round(n / 5);
  const ticks: number[] = [1];
  for (let t = step; t < n - step / 2; t += step) ticks.push(t);
  ticks.push(n);
  return ticks;
}

type ChartPoint = EquityInsight["points"][number];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs space-y-0.5 shadow-xl">
      <p className="text-slate-400">{fmtDate(pt.date)}</p>
      <p className={`font-mono font-semibold ${pnlColor(pt.equity)}`}>{fmtPnl(pt.equity)}</p>
      <p className="text-slate-500">#{pt.idx}</p>
    </div>
  );
}

export default function EquityChart({ insight }: Props) {
  const t = useTranslations("Cards.Equity");

  if (!insight || insight.points.length < 2) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-200">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-500">{t("notEnough")}</p>
        </CardContent>
      </Card>
    );
  }

  const { points, maxDrawdown } = insight;
  const equities = points.map((p) => p.equity);
  const minE = Math.min(...equities);
  const maxE = Math.max(...equities);
  const range = maxE - minE || 1;
  const padding = range * 0.08;

  const allPositive = minE >= 0;
  const allNegative = maxE <= 0;
  const zeroPct = `${((maxE / range) * 100).toFixed(1)}%`;

  const strokeColor = allNegative ? "#ef4444" : "#10b981";

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-slate-200">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="h-[180px] lg:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                  {allPositive ? (
                    <>
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </>
                  ) : allNegative ? (
                    <>
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.55} />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                      <stop offset={zeroPct} stopColor="#10b981" stopOpacity={0.02} />
                      <stop offset={zeroPct} stopColor="#ef4444" stopOpacity={0.02} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.55} />
                    </>
                  )}
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="idx"
                type="number"
                domain={[1, points.length]}
                ticks={getXTicks(points.length)}
                tickFormatter={(val: number) => fmtDate(points[Math.min(Math.round(val) - 1, points.length - 1)]?.date ?? "")}
                tick={{ fontSize: 9, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                height={20}
              />

              <YAxis
                tickFormatter={fmtY}
                tick={{ fontSize: 9, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={52}
                domain={[minE - padding, maxE + padding]}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />

              {maxDrawdown && (
                <>
                  <ReferenceArea
                    x1={maxDrawdown.peakIdx}
                    x2={maxDrawdown.troughIdx}
                    fill="#ef4444"
                    fillOpacity={0.07}
                    stroke="#ef4444"
                    strokeOpacity={0.25}
                    strokeWidth={1}
                    label={
                      maxDrawdown.troughIdx - maxDrawdown.peakIdx >= 4
                        ? { value: `Max DD: -${fmtPct(maxDrawdown.pct)}`, position: "insideBottomRight", fill: "#ef4444", fontSize: 9 }
                        : undefined
                    }
                  />
                  <ReferenceLine
                    y={maxDrawdown.peakEquity}
                    stroke="#64748b"
                    strokeDasharray="4 2"
                    strokeOpacity={0.5}
                    strokeWidth={1}
                  />
                </>
              )}

              <Area
                type="monotone"
                dataKey="equity"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill="url(#eqFill)"
                dot={false}
                activeDot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {maxDrawdown && (
          <div className="px-4 pt-2 pb-1 text-xs text-slate-500">
            {t("maxDrawdown")}{" "}
            <span className="text-red-400 font-mono">
              -{fmtPnl(maxDrawdown.amountUsd)} ({fmtPct(maxDrawdown.pct)})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
