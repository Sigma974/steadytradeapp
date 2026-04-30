"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { SyncData } from "@/lib/api-types";
import { fmtPct, fmtCompact, fmtCompactNum, pnlColor } from "@/lib/format";
import SiteHeader from "@/components/SiteHeader";
import PeriodSelector from "@/components/PeriodSelector";
import { useUserProfile } from "@/hooks/use-user-profile";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { daysToKey } from "@/lib/periods";
import CacheIndicator from "@/components/CacheIndicator";
import type { PeriodChange } from "@/lib/periods";
import StatGrid from "@/components/dashboard/StatGrid";
import RevengeCard from "@/components/dashboard/RevengeCard";
import HourlyGrid from "@/components/dashboard/HourlyGrid";
import BuyHoldTable from "@/components/dashboard/BuyHoldTable";
import StreakCard from "@/components/dashboard/StreakCard";
import LeverageCard from "@/components/dashboard/LeverageCard";
import WeekdayCard from "@/components/dashboard/WeekdayCard";
import HoldTimeCard from "@/components/dashboard/HoldTimeCard";
import FundingCard from "@/components/dashboard/FundingCard";
import DirectionCard from "@/components/dashboard/DirectionCard";
import RRCard from "@/components/dashboard/RRCard";
import TPSLCard from "@/components/dashboard/TPSLCard";
import RecentWRCard from "@/components/dashboard/RecentWRCard";
import EquityChart from "@/components/dashboard/EquityChart";
import DrawdownCard from "@/components/dashboard/DrawdownCard";
import VerdictCard from "@/components/dashboard/VerdictCard";
import SteadyScoreCard from "@/components/dashboard/SteadyScoreCard";

const HL_EXPLORER = "https://app.hyperliquid.xyz/explorer";
const MY_ADDRESS_KEY = "steady_my_address";

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Loader({ address }: { address: string }) {
  const t = useTranslations("TraderPage");
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-slate-300 text-sm">{t("fetchingHistory")}{".".repeat(dot)}</p>
        <p className="text-slate-600 text-xs font-mono">{abbrev(address)}</p>
      </div>
    </div>
  );
}

function CompareBar({ trader, mine }: { trader: SyncData; mine: SyncData }) {
  const t = useTranslations("TraderPage");
  const rows: { label: string; a: string; b: string; aClass?: string; bClass?: string }[] = [
    {
      label: t("compareWinRate"),
      a: fmtPct(trader.insights.general.winRate),
      b: fmtPct(mine.insights.general.winRate),
      aClass: pnlColor(trader.insights.general.winRate - 0.5),
      bClass: pnlColor(mine.insights.general.winRate - 0.5),
    },
    {
      label: t("compareTotalPnl"),
      a: fmtCompact(trader.insights.general.totalPnl),
      b: fmtCompact(mine.insights.general.totalPnl),
      aClass: pnlColor(trader.insights.general.totalPnl),
      bClass: pnlColor(mine.insights.general.totalPnl),
    },
    { label: t("compareTrades"), a: fmtCompactNum(trader.tradeCount), b: fmtCompactNum(mine.tradeCount) },
    {
      label: t("compareProfitFactor"),
      a: trader.insights.general.profitFactor === Infinity ? "∞" : trader.insights.general.profitFactor.toFixed(2),
      b: mine.insights.general.profitFactor === Infinity ? "∞" : mine.insights.general.profitFactor.toFixed(2),
      aClass: pnlColor(trader.insights.general.profitFactor - 1),
      bClass: pnlColor(mine.insights.general.profitFactor - 1),
    },
    {
      label: t("compareRR"),
      a: `${trader.insights.rr.realizedRR.toFixed(2)}R`,
      b: `${mine.insights.rr.realizedRR.toFixed(2)}R`,
    },
    {
      label: t("compareLongWR"),
      a: trader.insights.directionWinRate.long.trades > 0 ? fmtPct(trader.insights.directionWinRate.long.winRate) : "—",
      b: mine.insights.directionWinRate.long.trades > 0 ? fmtPct(mine.insights.directionWinRate.long.winRate) : "—",
    },
    {
      label: t("compareShortWR"),
      a: trader.insights.directionWinRate.short.trades > 0 ? fmtPct(trader.insights.directionWinRate.short.winRate) : "—",
      b: mine.insights.directionWinRate.short.trades > 0 ? fmtPct(mine.insights.directionWinRate.short.winRate) : "—",
    },
  ];

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="grid grid-cols-3 text-xs text-slate-500 uppercase tracking-wider px-4 py-2 border-b border-slate-800 bg-slate-800/40">
        <span />
        <span className="text-center font-mono text-slate-400">{abbrev(trader.address)}</span>
        <span className="text-center font-mono text-emerald-400">{t("compareYou", { address: abbrev(mine.address) })}</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-3 px-4 py-2.5 border-b border-slate-800 last:border-0 text-xs">
          <span className="text-slate-500">{row.label}</span>
          <span className={`text-center font-mono font-semibold ${row.aClass ?? "text-slate-200"}`}>{row.a}</span>
          <span className={`text-center font-mono font-semibold ${row.bClass ?? "text-slate-200"}`}>{row.b}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  address: string;
  initialData: SyncData | null;
  daysBack: number | null;
  initialStart?: number;
  initialEnd?: number;
}

export default function TraderClient({ address, initialData, daysBack: initialDays, initialStart, initialEnd }: Props) {
  const t = useTranslations("TraderPage");
  const locale = useLocale();
  const homeHref = locale === "fr" ? "/fr" : "/";

  const [activeDays, setActiveDays] = useState<number | null>(initialDays);
  const [activeStart, setActiveStart] = useState<number | undefined>(initialStart);
  const [activeEnd, setActiveEnd] = useState<number | undefined>(initialEnd);
  const [data, setData] = useState<SyncData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState(0);
  const forceRef = useRef(false);

  const userProfile = useUserProfile();
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; ok: boolean } | null>(null);

  const matchingWallet = userProfile
    ? userProfile.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) ?? null
    : null;

  function toPeriodLabel(days: number | null): string {
    const key = daysToKey(days);
    return key === "365d" ? "1y" : key;
  }

  async function handleSaveAnalysis() {
    if (!matchingWallet || !userProfile || savingAnalysis || !data) return;
    setSavingAnalysis(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.from("saved_analyses").insert({
        user_id: userProfile.userId,
        wallet_id: matchingWallet.id,
        period: toPeriodLabel(activeDays),
        start_date: activeStart ? new Date(activeStart).toISOString() : null,
        end_date: activeEnd ? new Date(activeEnd).toISOString() : null,
      });
      const msg = error ? t("saveError") : t("analysisSaved");
      setSaveToast({ message: msg, ok: !error });
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setSavingAnalysis(false);
    }
  }

  const [copied, setCopied] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [myData, setMyData] = useState<SyncData | null>(null);
  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const tradesHref = (() => {
    const base = locale === "fr" ? `/fr/trades/${address}` : `/trades/${address}`;
    if (activeDays !== null) return `${base}?days=${activeDays}`;
    if (activeStart && activeEnd) return `${base}?start=${activeStart}&end=${activeEnd}`;
    return base;
  })();

  useEffect(() => {
    if (data) return;
    if (activeDays === null && (!activeStart || !activeEnd)) return;
    let cancelled = false;
    const isForce = forceRef.current;
    forceRef.current = false;
    (async () => {
      try {
        const body: Record<string, unknown> = { address };
        if (activeDays !== null) body.daysBack = activeDays;
        else { body.startTime = activeStart; body.endTime = activeEnd; }
        if (isForce) body.force = true;
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (cancelled) return;
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Failed to load trader data."); return; }
        const isCached = res.headers.get("X-Cache") === "HIT";
        setFromCache(isCached);
        if (isCached) {
          setCacheAgeMinutes(Math.floor((Date.now() - new Date((json as SyncData).fetchedAt).getTime()) / 60000));
        }
        setData(json as SyncData);
      } catch {
        if (!cancelled) setError("Network error — could not reach the server.");
      }
    })();
    return () => { cancelled = true; };
  }, [address, activeDays, activeStart, activeEnd, data]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MY_ADDRESS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored && stored.toLowerCase() !== address.toLowerCase()) setMyAddress(stored);
    } catch {}
  }, [address]);

  function handlePeriodChange(change: PeriodChange) {
    if (change.daysBack !== undefined) {
      setActiveDays(change.daysBack);
      setActiveStart(undefined);
      setActiveEnd(undefined);
      window.history.replaceState({}, "", `?days=${change.daysBack}`);
    } else {
      setActiveDays(null);
      const start = change.startTime || undefined;
      const end = change.endTime || undefined;
      setActiveStart(start);
      setActiveEnd(end);
      if (!start || !end) return; // switched to custom mode, waiting for date input
      window.history.replaceState({}, "", `?start=${start}&end=${end}`);
    }
    setData(null);
    setError(null);
    setMyData(null);
    setShowCompare(false);
  }

  function handleRefresh() {
    forceRef.current = true;
    setFromCache(false);
    setData(null);
    setError(null);
  }

  async function handleCompare() {
    if (!myAddress) return;
    setShowCompare(true);
    if (myData) return;
    setLoadingCompare(true);
    try {
      const body: Record<string, unknown> = { address: myAddress };
      if (activeDays !== null) body.daysBack = activeDays;
      else { body.startTime = activeStart; body.endTime = activeEnd; }
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) setMyData(json as SyncData);
    } finally {
      setLoadingCompare(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function buildTweet(d: SyncData) {
    const wr = (d.insights.general.winRate * 100).toFixed(0);
    const pnl = fmtCompact(d.insights.general.totalPnl);
    const bestCoin = d.insights.buyHold.byCoin[0]?.coin ?? "";
    const bestDir = d.insights.directionWinRate.dominantDirection ?? "long";
    const url = `https://steadytrade.org/trader/${address}`;
    const lines = [
      `Just analyzed this Hyperliquid trader on @usesteadytrade:`,
      `→ ${wr}% win rate`,
      `→ ${pnl} PnL on ${d.tradeCount} trades`,
      bestCoin ? `→ Best at ${bestDir} ${bestCoin}` : "",
      url,
    ].filter(Boolean).join("\n");
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(lines)}`;
  }

  const short = abbrev(address);
  const isLoading = !data && !error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {saveToast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl ${
          saveToast.ok ? "bg-teal-500 text-white" : "bg-red-500/90 text-white"
        }`}>
          {saveToast.message}
        </div>
      )}
      <SiteHeader tagline={t("tagline")} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Title + action buttons */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-mono text-slate-100">{short}</h1>
            <p className="text-xs text-slate-500 font-mono truncate max-w-xs sm:max-w-none">{address}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700">
              {copied ? t("copied") : t("copyAddress")}
            </button>
            <a href={`${HL_EXPLORER}?address=${address}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700">
              {t("viewOnHL")}
            </a>
            <Link href={tradesHref} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700">
              {t("viewTrades")}
            </Link>
            {data && data.tradeCount > 0 && (
              <a href={buildTweet(data)} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors font-semibold">
                {t("shareOnX")}
              </a>
            )}
            {myAddress && data && (
              <button onClick={handleCompare} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors border border-emerald-700 font-semibold">
                {t("compareToMe")}
              </button>
            )}
            {matchingWallet && data && data.tradeCount > 0 && (
              <button
                onClick={handleSaveAnalysis}
                disabled={savingAnalysis}
                className="text-xs px-3 py-1.5 rounded-lg bg-teal-800/50 hover:bg-teal-700/50 text-teal-300 transition-colors border border-teal-700/50 font-semibold disabled:opacity-50"
              >
                {savingAnalysis ? "…" : t("saveAnalysis")}
              </button>
            )}
          </div>
        </div>

        {/* Period selector + meta info */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PeriodSelector
            daysBack={activeDays}
            startTime={activeStart}
            endTime={activeEnd}
            onChange={handlePeriodChange}
            disabled={isLoading}
          />
          {data && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {fromCache && (
                <CacheIndicator cacheAgeMinutes={cacheAgeMinutes} onRefresh={handleRefresh} />
              )}
              <span>
                {t("tradesInfo", {
                  trades: fmtCompactNum(data.tradeCount),
                  fills: fmtCompactNum(data.fillCount),
                  time: new Date(data.fetchedAt).toLocaleTimeString(),
                })}
              </span>
            </div>
          )}
        </div>

        {isLoading && <Loader address={address} />}

        {error && (
          <div className="text-center py-16 space-y-2">
            <p className="text-red-400 text-sm">{error}</p>
            <Link href={homeHref} className="text-xs text-slate-500 underline">{t("backToHome")}</Link>
          </div>
        )}

        {data && data.tradeCount === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-slate-400 text-sm">
              {activeDays !== null ? t("noTrades", { n: activeDays }) : t("noTradesCustom")}
            </p>
            <p className="text-slate-600 text-xs">{t("noTradesSub")}</p>
          </div>
        )}

        {showCompare && data && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">{t("compareTitle")}</h2>
            {loadingCompare ? (
              <p className="text-xs text-slate-500 animate-pulse">{t("compareLoading")}</p>
            ) : myData ? (
              <CompareBar trader={data} mine={myData} />
            ) : (
              <p className="text-xs text-red-400">{t("compareError")}</p>
            )}
          </div>
        )}

        {data && data.tradeCount > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <VerdictCard data={data} profileType={userProfile?.profileType} />
              <SteadyScoreCard data={data} daysBack={activeDays} />
            </div>

            <StatGrid stats={data.insights.general} />

            <EquityChart insight={data.insights.equity} />

            <DrawdownCard insight={data.insights.equity} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <DirectionCard insight={data.insights.directionWinRate} />
              <RRCard insight={data.insights.rr} />
              <TPSLCard insight={data.insights.tpsl} />
              <RecentWRCard insight={data.insights.recentWinRate} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RevengeCard insight={data.insights.revengeTrades} />
              <StreakCard insight={data.insights.streaks} />
              <HourlyGrid insight={data.insights.hourlyPerformance} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <LeverageCard insight={data.insights.leverage} />
              <WeekdayCard insight={data.insights.weekday} />
              <HoldTimeCard insight={data.insights.holdTime} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <FundingCard insight={data.insights.funding} />
              {data.insights.buyHold.byCoin.length > 0 && (
                <div className="lg:col-span-2">
                  <BuyHoldTable insight={data.insights.buyHold} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
