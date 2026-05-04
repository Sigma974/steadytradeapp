"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type VerdictData = {
  durationSeconds: number;
  startChoice: "clean" | "not_clean";
  count: number;
  pnlUsd: number;
  winRate: number;
  largestWin: number;
  largestLoss: number;
  insightKey: "profitable" | "losing" | "empty";
};

type TradeStats = {
  count: number;
  pnlUsd: number;
  winRate: number;
  lastTrade: { symbol: string; side: string; pnlUsd: number; closedAt: string } | null;
};

interface Props {
  sessionId: string;
  userId: string;
  startedAt: string;
  startChoice: "clean" | "not_clean";
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPnl(usd: number): string {
  const sign = usd >= 0 ? "+" : "";
  return `${sign}$${Math.abs(usd).toFixed(2)}`;
}

function timeAgo(isoStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export default function SessionTriggerScreen({
  sessionId,
  startedAt,
  startChoice,
}: Props) {
  const ts = useTranslations("SessionScreen");
  const tv = useTranslations("VerdictModal");
  const locale = useLocale();
  const router = useRouter();

  const [elapsed, setElapsed] = useState(0);
  const [tradeStats, setTradeStats] = useState<TradeStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "paused" | null>(null);
  const [ending, setEnding] = useState(false);
  const [verdict, setVerdict] = useState<VerdictData | null>(null);

  // Elapsed timer — updates every second
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Polling: sync trades every 15 seconds
  useEffect(() => {
    let cancelled = false;

    async function doSync() {
      try {
        const res = await fetch("/api/sessions/sync", { method: "POST" });
        if (cancelled) return;
        if (res.ok) {
          const { stats } = await res.json();
          setTradeStats(stats);
          setSyncStatus("synced");
        } else {
          setSyncStatus("paused");
        }
      } catch {
        if (!cancelled) setSyncStatus("paused");
      }
    }

    doSync();
    const id = setInterval(doSync, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [sessionId]);

  async function handleEndSession() {
    if (ending) return;
    setEnding(true);
    try {
      const res = await fetch("/api/sessions/end", { method: "POST" });
      if (res.ok) setVerdict(await res.json());
    } catch (e) {
      console.error("[session] end failed:", e);
    } finally {
      setEnding(false);
    }
  }

  function handleBackToDashboard() {
    router.push(locale === "fr" ? "/fr" : "/");
    router.refresh();
  }

  const startLabel =
    startChoice === "clean"
      ? ts("startedClean")
      : ts("startedNotClean");

  const lastTradeLabel = tradeStats?.lastTrade
    ? `${tradeStats.lastTrade.side.toUpperCase()} ${tradeStats.lastTrade.symbol} · ${formatPnl(tradeStats.lastTrade.pnlUsd)} · ${timeAgo(tradeStats.lastTrade.closedAt)}`
    : ts("noTrades");

  const syncLabel =
    syncStatus === "synced"
      ? ts("syncOk")
      : syncStatus === "paused"
        ? ts("syncPaused")
        : "…";

  const syncColor =
    syncStatus === "paused" ? "text-amber-500" : "text-slate-600";

  const pnlColor =
    tradeStats && tradeStats.pnlUsd > 0
      ? "text-emerald-400"
      : tradeStats && tradeStats.pnlUsd < 0
        ? "text-red-400"
        : "text-slate-400";

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight">Steady</span>
        <button
          onClick={handleEndSession}
          disabled={ending}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
        >
          {ending ? "…" : ts("endSession")}
        </button>
      </div>

      {/* Main content — passive observation zone */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {tradeStats && tradeStats.count > 0 ? (
          <div className="text-center space-y-2">
            <p className={`text-4xl font-bold tabular-nums ${pnlColor}`}>
              {formatPnl(tradeStats.pnlUsd)}
            </p>
            <p className="text-sm text-slate-500 font-mono">
              {tradeStats.count} {tradeStats.count === 1 ? "trade" : "trades"} · {tradeStats.winRate}% win
            </p>
          </div>
        ) : (
          <p className="text-slate-700 text-sm font-mono">{ts("waiting")}</p>
        )}
      </div>

      {/* Live Mirror panel */}
      <div className="w-full bg-[#0a0a0a] border-t border-slate-900 px-6 py-4 flex items-center gap-4">
        {/* Left: start choice + duration */}
        <div className="shrink-0 space-y-0.5">
          <p className={`text-xs font-mono font-semibold ${startChoice === "clean" ? "text-emerald-500" : "text-red-500"}`}>
            {startLabel}
          </p>
          <p className="text-xs text-slate-600 font-mono">{formatDuration(elapsed)}</p>
        </div>

        {/* Center: last trade */}
        <div className="flex-1 text-center">
          <p className="text-xs text-slate-500 font-mono truncate">{lastTradeLabel}</p>
        </div>

        {/* Right: sync status */}
        <div className="shrink-0 text-right">
          <p className={`text-xs font-mono ${syncColor}`}>{syncLabel}</p>
        </div>
      </div>

      {/* Verdict modal */}
      {verdict && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-950 border border-slate-800 rounded-2xl p-8 max-w-sm w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">{tv("title")}</h2>
              <p className="text-slate-500 font-mono text-sm">
                {formatDuration(verdict.durationSeconds)}
              </p>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("startChoice")}</span>
                <span className={`font-semibold ${verdict.startChoice === "clean" ? "text-emerald-400" : "text-red-400"}`}>
                  {verdict.startChoice === "clean" ? "CLEAN" : "NOT CLEAN"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("tradesLabel")}</span>
                <span className="font-semibold">{verdict.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("pnlLabel")}</span>
                <span className={`font-semibold ${verdict.count > 0 ? (verdict.pnlUsd >= 0 ? "text-emerald-400" : "text-red-400") : "text-slate-600"}`}>
                  {verdict.count > 0 ? formatPnl(verdict.pnlUsd) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("winRateLabel")}</span>
                <span className="font-semibold">
                  {verdict.count > 0 ? `${verdict.winRate}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("largestWinLabel")}</span>
                <span className={`font-semibold ${verdict.largestWin > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                  {verdict.count > 0 && verdict.largestWin > 0 ? formatPnl(verdict.largestWin) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{tv("largestLossLabel")}</span>
                <span className={`font-semibold ${verdict.largestLoss < 0 ? "text-red-400" : "text-slate-600"}`}>
                  {verdict.count > 0 && verdict.largestLoss < 0 ? formatPnl(verdict.largestLoss) : "—"}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl px-4 py-3 text-sm text-slate-300">
              {verdict.insightKey === "profitable" && tv("insightProfitable")}
              {verdict.insightKey === "losing" && tv("insightLosing")}
              {verdict.insightKey === "empty" && tv("insightEmpty")}
            </div>

            <button
              onClick={handleBackToDashboard}
              className="w-full bg-slate-200 hover:bg-white text-slate-900 font-semibold rounded-lg py-3 text-sm transition-colors"
            >
              {tv("backToDashboard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
