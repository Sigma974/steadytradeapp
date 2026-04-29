"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PeriodSelector from "@/components/PeriodSelector";
import CacheIndicator from "@/components/CacheIndicator";
import type { SyncData } from "@/lib/api-types";
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
import VerdictCard from "@/components/dashboard/VerdictCard";
import { fmtCompactNum } from "@/lib/format";
import Footer from "@/components/Footer";

export default function Home() {
  const t = useTranslations("HomePage");
  const locale = useLocale();

  const [address, setAddress] = useState("");
  const [activeDays, setActiveDays] = useState<number | null>(30);
  const [activeStart, setActiveStart] = useState<number | undefined>();
  const [activeEnd, setActiveEnd] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SyncData | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState(0);
  const [lastAddress, setLastAddress] = useState("");

  async function fetchData(
    addr: string,
    days: number | null,
    start?: number,
    end?: number,
    force?: boolean,
  ) {
    setError(null);
    setLoading(true);
    setData(null);
    setFromCache(false);
    try {
      const body: Record<string, unknown> = { address: addr };
      if (days !== null) body.daysBack = days;
      else { body.startTime = start; body.endTime = end; }
      if (force) body.force = true;
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? t("errors.generic")); return; }
      const isCached = res.headers.get("X-Cache") === "HIT";
      setFromCache(isCached);
      if (isCached) {
        setCacheAgeMinutes(Math.floor((Date.now() - new Date((json as SyncData).fetchedAt).getTime()) / 60000));
      }
      setData(json as SyncData);
    } catch {
      setError(t("errors.network"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    setLastAddress(trimmed);
    try { localStorage.setItem("steady_my_address", trimmed); } catch {}
    await fetchData(trimmed, activeDays, activeStart, activeEnd);
  }

  function handlePeriodChange(change: PeriodChange) {
    if (change.daysBack !== undefined) {
      setActiveDays(change.daysBack);
      setActiveStart(undefined);
      setActiveEnd(undefined);
      if (lastAddress) fetchData(lastAddress, change.daysBack);
    } else {
      setActiveDays(null);
      const start = change.startTime || undefined;
      const end = change.endTime || undefined;
      setActiveStart(start);
      setActiveEnd(end);
      if (start && end && lastAddress) fetchData(lastAddress, null, start, end);
    }
  }

  function handleRefresh() {
    if (!lastAddress) return;
    fetchData(lastAddress, activeDays, activeStart, activeEnd, true);
  }

  const traderProfileHref =
    locale === "fr" ? `/fr/trader/${lastAddress}` : `/trader/${lastAddress}`;
  const tradesHref =
    activeDays !== null
      ? (locale === "fr" ? `/fr/trades/${lastAddress}?days=${activeDays}` : `/trades/${lastAddress}?days=${activeDays}`)
      : (locale === "fr" ? `/fr/trades/${lastAddress}?start=${activeStart}&end=${activeEnd}` : `/trades/${lastAddress}?start=${activeStart}&end=${activeEnd}`);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-slate-100">Steady</span>
            <span className="text-xs text-slate-500 hidden sm:inline">{t("tagline")}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              className="font-mono bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 flex-1"
              placeholder={t("form.placeholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={loading || !address.trim()}
              className="bg-slate-100 text-slate-950 hover:bg-slate-200 font-semibold px-6"
            >
              {loading ? t("form.analyzing") : t("form.analyze")}
            </Button>
          </div>
          <PeriodSelector
            daysBack={activeDays}
            startTime={activeStart}
            endTime={activeEnd}
            onChange={handlePeriodChange}
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-red-400 font-mono">{error}</p>
          )}
        </form>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-800" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-56 rounded-xl bg-slate-800" />
              <div className="h-56 rounded-xl bg-slate-800" />
            </div>
            <div className="h-64 rounded-xl bg-slate-800" />
          </div>
        )}

        {/* Dashboard */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-mono truncate">{data.address}</span>
              <div className="flex flex-wrap items-center gap-3">
                {fromCache && (
                  <CacheIndicator cacheAgeMinutes={cacheAgeMinutes} onRefresh={handleRefresh} />
                )}
                <span>
                  {t("meta.tradesInfo", {
                    trades: fmtCompactNum(data.tradeCount),
                    fills: fmtCompactNum(data.fillCount),
                    time: new Date(data.fetchedAt).toLocaleTimeString(),
                  })}
                </span>
                {lastAddress && (
                  <>
                    <Link
                      href={traderProfileHref}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      {t("meta.viewProfile")}
                    </Link>
                    <Link
                      href={tradesHref}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      {t("meta.viewTrades")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Verdict */}
            {data.tradeCount > 0 && <VerdictCard data={data} />}

            {/* Stat cards */}
            <StatGrid stats={data.insights.general} />

            {/* Equity curve */}
            <EquityChart insight={data.insights.equity} />

            {/* Revenge + Streaks + Hourly */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RevengeCard insight={data.insights.revengeTrades} />
              <StreakCard insight={data.insights.streaks} />
              <HourlyGrid insight={data.insights.hourlyPerformance} />
            </div>

            {/* Leverage + Weekday + Hold time */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <LeverageCard insight={data.insights.leverage} />
              <WeekdayCard insight={data.insights.weekday} />
              <HoldTimeCard insight={data.insights.holdTime} />
            </div>

            {/* Direction WR + RR + TP/SL + RecentWR + Funding + Buy & hold */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <DirectionCard insight={data.insights.directionWinRate} />
              <RRCard insight={data.insights.rr} />
              <TPSLCard insight={data.insights.tpsl} />
              <RecentWRCard insight={data.insights.recentWinRate} />
              <FundingCard insight={data.insights.funding} />
              {data.insights.buyHold.byCoin.length > 0 && (
                <div className="lg:col-span-3">
                  <BuyHoldTable insight={data.insights.buyHold} />
                </div>
              )}
            </div>

            {data.tradeCount === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                {t("noTrades")}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div className="text-center py-24 space-y-2">
            <p className="text-slate-600 text-sm">{t("emptyState.hint")}</p>
            <p className="text-slate-700 text-xs">{t("emptyState.readonly")}</p>
          </div>
        )}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
