"use client";

import { useState, useEffect, useCallback } from "react";
import type { SyncData } from "@/lib/api-types";
import { fmtPct, fmtCompact, fmtCompactNum, fmtFixed, pnlColor } from "@/lib/format";
import SiteHeader from "@/components/SiteHeader";
import PeriodSelector from "@/components/PeriodSelector";
import { Skeleton } from "@/components/ui/skeleton";
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

function ColumnStats({ data }: { data: SyncData }) {
  const g = data.insights.general;
  const rr = data.insights.rr;
  const eq = data.insights.equity;

  const rows: { label: string; value: string; cls: string }[] = [
    {
      label: "Win Rate",
      value: fmtPct(g.winRate),
      cls: pnlColor(g.winRate - 0.5),
    },
    {
      label: "Net PnL",
      value: fmtCompact(g.totalPnl),
      cls: pnlColor(g.totalPnl),
    },
    {
      label: "Trades",
      value: fmtCompactNum(data.tradeCount),
      cls: "text-slate-200",
    },
    {
      label: "Profit Factor",
      value: g.profitFactor === Infinity ? "∞" : fmtFixed(g.profitFactor, 2),
      cls: pnlColor(g.profitFactor - 1),
    },
    {
      label: "Avg R/R",
      value: fmtFixed(rr.realizedRR, 2, "R"),
      cls: pnlColor(rr.realizedRR != null ? rr.realizedRR - 1 : null),
    },
    {
      label: "Max Drawdown",
      value: eq.maxDrawdown ? `-${fmtPct(eq.maxDrawdown.pct)}` : "—",
      cls: eq.maxDrawdown ? "text-red-400" : "text-slate-500",
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
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-xs">
            <span className="text-slate-500">{row.label}</span>
            <span className={`font-mono font-semibold ${row.cls}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletColumn({
  address,
  data,
  loading,
  error,
}: {
  address: string;
  data: SyncData | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <ColumnSkeleton />;
  if (error) return <ColumnError address={address} message={error} />;
  if (!data || data.tradeCount === 0) return <ColumnEmpty address={address} />;
  return <ColumnStats data={data} />;
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
          />
          <WalletColumn
            address={address2}
            data={data2}
            loading={loading2}
            error={error2}
          />
        </div>
      </main>
    </div>
  );
}
