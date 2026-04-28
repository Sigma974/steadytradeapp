"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { SyncData, SerializedTrade } from "@/lib/api-types";
import { fmtPnl, fmtDuration, pnlColor } from "@/lib/format";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type SortKey = keyof SerializedTrade;
type SortDir = "asc" | "desc";

interface Props {
  address: string;
  initialData: SyncData | null;
  daysBack: number;
}

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtPrice(px: number): string {
  if (px >= 10000) return `$${px.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (px >= 100) return `$${px.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (px >= 1) return `$${px.toFixed(4)}`;
  return `$${px.toFixed(6)}`;
}

function fmtSize(notional: number): string {
  if (notional >= 1_000_000) return `$${(notional / 1_000_000).toFixed(2)}M`;
  if (notional >= 1000) return `$${(notional / 1000).toFixed(1)}k`;
  return `$${notional.toFixed(0)}`;
}

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-slate-700 ml-0.5">↕</span>;
  return <span className="text-slate-300 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function TradesClient({ address, initialData, daysBack }: Props) {
  const t = useTranslations("TradesPage");
  const locale = useLocale();

  const [data, setData] = useState<SyncData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("closeAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterCoin, setFilterCoin] = useState("");
  const [filterDir, setFilterDir] = useState<"all" | "long" | "short">("all");

  const homeHref = locale === "fr" ? "/fr" : "/";
  const backHref = locale === "fr" ? `/fr/trader/${address}` : `/trader/${address}`;

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, daysBack }),
        });
        if (cancelled) return;
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? t("fetchError")); setLoading(false); return; }
        setData(json as SyncData);
        setLoading(false);
      } catch {
        if (!cancelled) { setError(t("fetchError")); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [address, daysBack, data, t]);

  const coins = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.trades.map((t) => t.coin))].sort();
  }, [data]);

  const filtered = useMemo<SerializedTrade[]>(() => {
    if (!data) return [];
    let rows = [...data.trades];
    if (filterCoin) rows = rows.filter((t) => t.coin === filterCoin);
    if (filterDir !== "all") rows = rows.filter((t) => t.side === filterDir);
    rows.sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return rows;
  }, [data, filterCoin, filterDir, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => ({ pnl: acc.pnl + t.pnlNet, fees: acc.fees + t.feesTotal }),
      { pnl: 0, fees: 0 }
    );
  }, [filtered]);

  function handleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    const headers = ["Coin", "Side", "Open", "Close", "Duration (s)", "Entry", "Exit", "Notional", "PnL Net", "Fees", "Fills"];
    const rows = filtered.map((t) => [
      t.coin, t.side, t.openAt, t.closeAt, t.durationSeconds,
      t.avgEntryPx, t.avgExitPx, t.notional.toFixed(2),
      t.pnlNet.toFixed(4), t.feesTotal.toFixed(4), t.numFills,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-${address.slice(0, 8)}-${daysBack}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "coin", label: t("colCoin") },
    { key: "side", label: t("colSide") },
    { key: "openAt", label: t("colOpen") },
    { key: "closeAt", label: t("colClose") },
    { key: "durationSeconds", label: t("colDuration"), align: "right" },
    { key: "avgEntryPx", label: t("colEntry"), align: "right" },
    { key: "avgExitPx", label: t("colExit"), align: "right" },
    { key: "notional", label: t("colSize"), align: "right" },
    { key: "pnlNet", label: t("colPnl"), align: "right" },
    { key: "feesTotal", label: t("colFees"), align: "right" },
    { key: "numFills", label: t("colFills"), align: "right" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href={homeHref} className="text-lg font-bold tracking-tight text-slate-100 hover:text-slate-300 transition-colors">
              Steady
            </Link>
            <span className="text-slate-700 hidden sm:inline">·</span>
            <Link href={backHref} className="text-xs text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline">
              {t("backToTrader")}
            </Link>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">
        {/* Page title + actions */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-slate-100">{t("title")}</h1>
            <p className="text-xs text-slate-500 font-mono">{abbrev(address)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={backHref}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 sm:hidden"
            >
              {t("backToTrader")}
            </Link>
            {data && filtered.length > 0 && (
              <button
                onClick={exportCsv}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              >
                {t("exportCsv")}
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-500 text-sm">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
            {t("loading")}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="text-sm text-red-400 py-8 text-center">{error}</p>
        )}

        {/* Filters + table */}
        {data && !loading && (
          <>
            {/* Filters row */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Coin filter */}
              <select
                value={filterCoin}
                onChange={(e) => setFilterCoin(e.target.value)}
                className="h-8 rounded-md border border-slate-700 bg-slate-900 text-slate-200 text-xs px-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="">{t("filterAllCoins")}</option>
                {coins.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Direction filter */}
              <div className="flex rounded-md overflow-hidden border border-slate-700 text-xs">
                {(["all", "long", "short"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilterDir(d)}
                    className={`px-3 py-1.5 transition-colors ${
                      filterDir === d
                        ? "bg-slate-700 text-slate-100"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {d === "all" ? t("filterAll") : d === "long" ? t("filterLong") : t("filterShort")}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 ml-auto">
                {t("nTrades", { n: filtered.length })}
              </span>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">{t("noTrades")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`px-3 py-2.5 font-medium cursor-pointer select-none whitespace-nowrap hover:text-slate-200 transition-colors ${
                            col.align === "right" ? "text-right" : "text-left"
                          } ${col.key === "coin" ? "sticky left-0 bg-slate-800/60 z-10" : ""}`}
                        >
                          {col.label}
                          <SortIcon col={col.key} active={sortKey === col.key} dir={sortDir} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((trade, i) => (
                      <tr
                        key={`${trade.coin}-${trade.openAt}-${i}`}
                        className={`border-t border-slate-800 hover:bg-slate-800/30 transition-colors ${
                          trade.pnlNet >= 0 ? "border-l-2 border-l-emerald-800" : "border-l-2 border-l-red-900"
                        }`}
                      >
                        {/* Coin */}
                        <td className="px-3 py-2 font-mono font-semibold text-slate-200 whitespace-nowrap sticky left-0 bg-slate-950">
                          {trade.coin}
                        </td>
                        {/* Direction */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${
                            trade.side === "long"
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-red-900/40 text-red-400"
                          }`}>
                            {trade.side}
                          </span>
                        </td>
                        {/* Open */}
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {fmtDatetime(trade.openAt)}
                        </td>
                        {/* Close */}
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {fmtDatetime(trade.closeAt)}
                        </td>
                        {/* Duration */}
                        <td className="px-3 py-2 text-right text-slate-400 whitespace-nowrap">
                          {fmtDuration(trade.durationSeconds)}
                        </td>
                        {/* Entry */}
                        <td className="px-3 py-2 text-right font-mono text-slate-300 whitespace-nowrap">
                          {fmtPrice(trade.avgEntryPx)}
                        </td>
                        {/* Exit */}
                        <td className="px-3 py-2 text-right font-mono text-slate-300 whitespace-nowrap">
                          {fmtPrice(trade.avgExitPx)}
                        </td>
                        {/* Size */}
                        <td className="px-3 py-2 text-right font-mono text-slate-400 whitespace-nowrap">
                          {fmtSize(trade.notional)}
                        </td>
                        {/* PnL */}
                        <td className={`px-3 py-2 text-right font-mono font-semibold whitespace-nowrap ${pnlColor(trade.pnlNet)}`}>
                          {fmtPnl(trade.pnlNet)}
                        </td>
                        {/* Fees */}
                        <td className="px-3 py-2 text-right font-mono text-slate-500 whitespace-nowrap">
                          {fmtPnl(-trade.feesTotal)}
                        </td>
                        {/* Fills */}
                        <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
                          {trade.numFills}
                        </td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="border-t-2 border-slate-700 bg-slate-800/30 font-semibold">
                      <td className="px-3 py-2.5 text-slate-400 sticky left-0 bg-slate-800/60 whitespace-nowrap" colSpan={2}>
                        {t("totalRow", { n: filtered.length })}
                      </td>
                      <td colSpan={6} />
                      <td className={`px-3 py-2.5 text-right font-mono ${pnlColor(totals.pnl)}`}>
                        {fmtPnl(totals.pnl)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                        {fmtPnl(-totals.fees)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
