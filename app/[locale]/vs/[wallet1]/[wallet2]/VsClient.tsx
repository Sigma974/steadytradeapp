"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SyncData } from "@/lib/api-types";
import { fmtPct, fmtCompact, fmtCompactNum, fmtCompactUsd, fmtFixed, fmtDuration, pnlColor } from "@/lib/format";
import SiteHeader from "@/components/SiteHeader";
import PeriodSelector from "@/components/PeriodSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateSteadyScore } from "@/lib/insights/steadyScore";
import { getScoreTier } from "@/lib/score-tiers";
import type { PeriodChange } from "@/lib/periods";

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function fetchWallet(
  address: string,
  daysBack: number | null,
  startTime: number | undefined,
  endTime: number | undefined,
): Promise<SyncData> {
  const body: Record<string, unknown> = { address };
  if (daysBack !== null) body.daysBack = daysBack;
  else { body.startTime = startTime; body.endTime = endTime; }

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load trader data.");
  return json as SyncData;
}

// ---------------------------------------------------------------------------
// Winner logic
// ---------------------------------------------------------------------------

type MetricKey = "score" | "winRate" | "netPnl" | "profitFactor" | "maxDrawdown";
type Winner = 1 | 2 | null;
type Winners = Record<MetricKey, Winner>;

function extractNums(data: SyncData) {
  const score = calculateSteadyScore(data)?.score ?? null;
  const g = data.insights.general;
  const pf = isFinite(g.profitFactor) && g.winners > 0 ? g.profitFactor : null;
  const maxDrawdownPct = data.insights.equity.maxDrawdown?.pct ?? null;
  return { score, winRate: g.winRate, netPnl: g.totalPnl, profitFactor: pf, maxDrawdownPct };
}

function computeWinners(
  n1: ReturnType<typeof extractNums>,
  n2: ReturnType<typeof extractNums>,
): Winners {
  const TIE_THRESHOLD = 0.01;

  function higherWins(v1: number | null, v2: number | null): Winner {
    if (v1 == null || v2 == null) return null;
    const max = Math.max(Math.abs(v1), Math.abs(v2));
    if (max === 0) return null;
    if (Math.abs(v1 - v2) / max < TIE_THRESHOLD) return null;
    return v1 > v2 ? 1 : 2;
  }

  function lowerWins(v1: number | null, v2: number | null): Winner {
    // null means no drawdown at all — that wallet wins outright
    if (v1 == null && v2 == null) return null;
    if (v1 == null) return 1;
    if (v2 == null) return 2;
    const max = Math.max(Math.abs(v1), Math.abs(v2));
    if (max === 0) return null;
    if (Math.abs(v1 - v2) / max < TIE_THRESHOLD) return null;
    return v1 < v2 ? 1 : 2;
  }

  return {
    score: higherWins(n1.score, n2.score),
    winRate: higherWins(n1.winRate, n2.winRate),
    netPnl: higherWins(n1.netPnl, n2.netPnl),
    profitFactor: higherWins(n1.profitFactor, n2.profitFactor),
    maxDrawdown: lowerWins(n1.maxDrawdownPct, n2.maxDrawdownPct),
  };
}

// ---------------------------------------------------------------------------
// Column sub-components
// ---------------------------------------------------------------------------

function ColumnSkeleton() {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-3 w-16" />
      <div className="pt-2 divide-y divide-slate-800/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnEmpty({ address }: { address: string }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[260px] gap-2">
      <p className="text-slate-400 text-sm font-mono">{abbrev(address)}</p>
      <p className="text-slate-600 text-xs">No trades in this period</p>
    </div>
  );
}

function ColumnError({ address, message }: { address: string; message: string }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[260px] gap-2 text-center">
      <p className="text-slate-400 text-sm font-mono">{abbrev(address)}</p>
      <p className="text-red-400 text-xs">{message}</p>
    </div>
  );
}

type RowDef = {
  key: MetricKey | null;
  label: string;
  value: string;
  cls: string;
};

function ColumnStats({
  data,
  side,
  winners,
}: {
  data: SyncData;
  side: 1 | 2;
  winners: Winners | null;
}) {
  const g = data.insights.general;
  const eq = data.insights.equity;
  const scoreResult = useMemo(() => calculateSteadyScore(data), [data]);

  const rows: RowDef[] = [
    {
      key: "score",
      label: "Score",
      value: scoreResult ? `${scoreResult.score}/100` : "—",
      cls: scoreResult ? getScoreTier(scoreResult.score).tailwindText : "text-slate-500",
    },
    {
      key: "winRate",
      label: "Win Rate",
      value: fmtPct(g.winRate),
      cls: pnlColor(g.winRate - 0.5),
    },
    {
      key: "netPnl",
      label: "Net PnL",
      value: fmtCompact(g.totalPnl),
      cls: pnlColor(g.totalPnl),
    },
    {
      key: "profitFactor",
      label: "Profit Factor",
      value: g.profitFactor === Infinity ? "∞" : g.winners === 0 ? "—" : fmtFixed(g.profitFactor, 2),
      cls: isFinite(g.profitFactor) && g.winners > 0 ? pnlColor(g.profitFactor - 1) : "text-slate-400",
    },
    {
      key: "maxDrawdown",
      label: "Max Drawdown",
      // pct can exceed 1 (100%) when the PnL peak is tiny vs the losses — show USD in that case
      value: eq.maxDrawdown
        ? eq.maxDrawdown.pct <= 1
          ? `-${fmtPct(eq.maxDrawdown.pct)}`
          : `-${fmtCompactUsd(eq.maxDrawdown.amountUsd)}`
        : "—",
      cls: eq.maxDrawdown ? "text-red-400" : "text-slate-500",
    },
    {
      key: null,
      label: "Avg Hold",
      value: fmtDuration(g.avgDurationSeconds),
      cls: "text-slate-200",
    },
  ];

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-sm font-mono text-slate-300" title={data.address}>
          {abbrev(data.address)}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {fmtCompactNum(data.tradeCount)} trades
        </p>
      </div>
      <div className="divide-y divide-slate-800/60">
        {rows.map((row) => {
          const winner = row.key !== null ? (winners?.[row.key] ?? null) : null;
          const isWinner = winner === side;
          const isLoser = winner !== null && winner !== side;

          return (
            <div
              key={row.label}
              className={`relative flex items-center justify-between px-4 py-2.5 text-xs ${
                isWinner ? "bg-emerald-950/30" : ""
              }`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                  isWinner ? "bg-emerald-500/60" : "bg-transparent"
                }`}
              />
              <span className="text-slate-500">{row.label}</span>
              <span
                className={`font-mono font-semibold ${isLoser ? "text-slate-500" : row.cls}`}
              >
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WalletColumn({
  address,
  data,
  loading,
  error,
  side,
  winners,
}: {
  address: string;
  data: SyncData | null;
  loading: boolean;
  error: string | null;
  side: 1 | 2;
  winners: Winners | null;
}) {
  if (loading) return <ColumnSkeleton />;
  if (error) return <ColumnError address={address} message={error} />;
  if (!data || data.tradeCount === 0) return <ColumnEmpty address={address} />;
  return <ColumnStats data={data} side={side} winners={winners} />;
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface Props {
  address1: string;
  address2: string;
  initialData1: SyncData | null;
  initialData2: SyncData | null;
  initialDays: number | null;
  initialStart?: number;
  initialEnd?: number;
}

export default function VsClient({
  address1,
  address2,
  initialData1,
  initialData2,
  initialDays,
  initialStart,
  initialEnd,
}: Props) {
  const [activeDays, setActiveDays] = useState<number | null>(initialDays);
  const [activeStart, setActiveStart] = useState<number | undefined>(initialStart);
  const [activeEnd, setActiveEnd] = useState<number | undefined>(initialEnd);

  const [data1, setData1] = useState<SyncData | null>(initialData1);
  const [data2, setData2] = useState<SyncData | null>(initialData2);
  const [loading1, setLoading1] = useState(initialData1 === null);
  const [loading2, setLoading2] = useState(initialData2 === null);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  useEffect(() => {
    const needs1 = data1 === null && !error1;
    const needs2 = data2 === null && !error2;
    if (!needs1 && !needs2) return;

    let cancelled = false;

    const run1 = needs1
      ? fetchWallet(address1, activeDays, activeStart, activeEnd)
          .then((d) => { if (!cancelled) { setData1(d); setLoading1(false); } })
          .catch((e: unknown) => { if (!cancelled) { setError1(e instanceof Error ? e.message : "Error"); setLoading1(false); } })
      : Promise.resolve();

    const run2 = needs2
      ? fetchWallet(address2, activeDays, activeStart, activeEnd)
          .then((d) => { if (!cancelled) { setData2(d); setLoading2(false); } })
          .catch((e: unknown) => { if (!cancelled) { setError2(e instanceof Error ? e.message : "Error"); setLoading2(false); } })
      : Promise.resolve();

    void Promise.all([run1, run2]);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data1, data2, error1, error2]);

  const handlePeriodChange = useCallback((change: PeriodChange) => {
    if (change.daysBack !== undefined) {
      setActiveDays(change.daysBack);
      setActiveStart(undefined);
      setActiveEnd(undefined);
    } else {
      const start = change.startTime || undefined;
      const end = change.endTime || undefined;
      setActiveDays(null);
      setActiveStart(start);
      setActiveEnd(end);
      if (!start || !end) return;
    }
    setData1(null);
    setData2(null);
    setError1(null);
    setError2(null);
    setLoading1(true);
    setLoading2(true);
  }, []);

  const winners = useMemo((): Winners | null => {
    if (!data1 || !data2) return null;
    return computeWinners(extractNums(data1), extractNums(data2));
  }, [data1, data2]);

  const bothLoading = loading1 && loading2;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold font-mono text-slate-100">
            {abbrev(address1)}{" "}
            <span className="text-slate-500 mx-1">VS</span>{" "}
            {abbrev(address2)}
          </h1>
          <PeriodSelector
            daysBack={activeDays}
            startTime={activeStart}
            endTime={activeEnd}
            onChange={handlePeriodChange}
            disabled={bothLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WalletColumn
            address={address1}
            data={data1}
            loading={loading1}
            error={error1}
            side={1}
            winners={winners}
          />
          <WalletColumn
            address={address2}
            data={data2}
            loading={loading2}
            error={error2}
            side={2}
            winners={winners}
          />
        </div>
      </main>
    </div>
  );
}
