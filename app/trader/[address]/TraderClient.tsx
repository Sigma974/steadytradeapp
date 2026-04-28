"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SyncData } from "@/lib/api-types";
import { fmtPnl, fmtPct, pnlColor } from "@/lib/format";
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

const HL_EXPLORER = "https://app.hyperliquid.xyz/explorer";
const MY_ADDRESS_KEY = "steady_my_address";

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

function Loader({ address }: { address: string }) {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-slate-300 text-sm">Fetching trade history{".".repeat(dot)}</p>
        <p className="text-slate-600 text-xs font-mono">{abbrev(address)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare bar — shows key stats side-by-side
// ---------------------------------------------------------------------------

function CompareBar({
  trader,
  mine,
}: {
  trader: SyncData;
  mine: SyncData;
}) {
  const rows: { label: string; a: string; b: string; aClass?: string; bClass?: string }[] = [
    {
      label: "Win Rate",
      a: fmtPct(trader.insights.general.winRate),
      b: fmtPct(mine.insights.general.winRate),
      aClass: pnlColor(trader.insights.general.winRate - 0.5),
      bClass: pnlColor(mine.insights.general.winRate - 0.5),
    },
    {
      label: "Total PnL",
      a: fmtPnl(trader.insights.general.totalPnl),
      b: fmtPnl(mine.insights.general.totalPnl),
      aClass: pnlColor(trader.insights.general.totalPnl),
      bClass: pnlColor(mine.insights.general.totalPnl),
    },
    {
      label: "Trades",
      a: String(trader.tradeCount),
      b: String(mine.tradeCount),
    },
    {
      label: "Profit Factor",
      a: trader.insights.general.profitFactor === Infinity ? "∞" : trader.insights.general.profitFactor.toFixed(2),
      b: mine.insights.general.profitFactor === Infinity ? "∞" : mine.insights.general.profitFactor.toFixed(2),
      aClass: pnlColor(trader.insights.general.profitFactor - 1),
      bClass: pnlColor(mine.insights.general.profitFactor - 1),
    },
    {
      label: "RR",
      a: `${trader.insights.rr.realizedRR.toFixed(2)}R`,
      b: `${mine.insights.rr.realizedRR.toFixed(2)}R`,
    },
    {
      label: "Long WR",
      a: trader.insights.directionWinRate.long.trades > 0 ? fmtPct(trader.insights.directionWinRate.long.winRate) : "—",
      b: mine.insights.directionWinRate.long.trades > 0 ? fmtPct(mine.insights.directionWinRate.long.winRate) : "—",
    },
    {
      label: "Short WR",
      a: trader.insights.directionWinRate.short.trades > 0 ? fmtPct(trader.insights.directionWinRate.short.winRate) : "—",
      b: mine.insights.directionWinRate.short.trades > 0 ? fmtPct(mine.insights.directionWinRate.short.winRate) : "—",
    },
  ];

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-3 text-xs text-slate-500 uppercase tracking-wider px-4 py-2 border-b border-slate-800 bg-slate-800/40">
        <span />
        <span className="text-center font-mono text-slate-400">{abbrev(trader.address)}</span>
        <span className="text-center font-mono text-emerald-400">You ({abbrev(mine.address)})</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-3 px-4 py-2.5 border-b border-slate-800 last:border-0 text-xs"
        >
          <span className="text-slate-500">{row.label}</span>
          <span className={`text-center font-mono font-semibold ${row.aClass ?? "text-slate-200"}`}>{row.a}</span>
          <span className={`text-center font-mono font-semibold ${row.bClass ?? "text-slate-200"}`}>{row.b}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  address: string;
  initialData: SyncData | null;
  daysBack: number;
}

export default function TraderClient({ address, initialData, daysBack }: Props) {
  const [data, setData] = useState<SyncData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [myData, setMyData] = useState<SyncData | null>(null);
  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Fetch data if no server-side cache hit
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
        if (!res.ok) {
          setError(json.error ?? "Failed to load trader data.");
          return;
        }
        setData(json as SyncData);
      } catch {
        if (!cancelled) setError("Network error — could not reach the server.");
      }
    })();

    return () => { cancelled = true; };
  }, [address, daysBack, data]);

  // Read myAddress from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MY_ADDRESS_KEY);
      if (stored && stored.toLowerCase() !== address.toLowerCase()) {
        setMyAddress(stored);
      }
    } catch {}
  }, [address]);

  async function handleCompare() {
    if (!myAddress) return;
    setShowCompare(true);
    if (myData) return;
    setLoadingCompare(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: myAddress, daysBack }),
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
    const pnl = fmtPnl(d.insights.general.totalPnl);
    const bestCoin = d.insights.buyHold.byCoin[0]?.coin ?? "";
    const bestDir = d.insights.directionWinRate.dominantDirection ?? "long";
    const url = `https://steadytrade.org/trader/${address}`;
    const lines = [
      `Just analyzed this Hyperliquid trader on @usesteady:`,
      `→ ${wr}% win rate`,
      `→ ${pnl} PnL on ${d.tradeCount} trades`,
      bestCoin ? `→ Best at ${bestDir} ${bestCoin}` : "",
      url,
    ].filter(Boolean).join("\n");
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(lines)}`;
  }

  const short = abbrev(address);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-100 hover:text-slate-300 transition-colors">
            Steady
          </Link>
          <span className="text-xs text-slate-500 hidden sm:inline">Hyperliquid analytics</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Trader header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-mono text-slate-100">{short}</h1>
            <p className="text-xs text-slate-500 font-mono truncate max-w-xs sm:max-w-none">{address}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            >
              {copied ? "Copied!" : "Copy address"}
            </button>
            <a
              href={`${HL_EXPLORER}?address=${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            >
              View on Hyperliquid ↗
            </a>
            {data && data.tradeCount > 0 && (
              <a
                href={buildTweet(data)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors font-semibold"
              >
                Share on X
              </a>
            )}
            {myAddress && data && (
              <button
                onClick={handleCompare}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors border border-emerald-700 font-semibold"
              >
                Compare to me
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {!data && !error && <Loader address={address} />}

        {/* Error */}
        {error && (
          <div className="text-center py-16 space-y-2">
            <p className="text-red-400 text-sm">{error}</p>
            <Link href="/" className="text-xs text-slate-500 underline">Back to home</Link>
          </div>
        )}

        {/* Empty state */}
        {data && data.tradeCount === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-slate-400 text-sm">No trades found for this address in the last {daysBack} days.</p>
            <p className="text-slate-600 text-xs">The address may be inactive or only have open positions.</p>
          </div>
        )}

        {/* Compare section */}
        {showCompare && data && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Compare to me</h2>
            {loadingCompare ? (
              <p className="text-xs text-slate-500 animate-pulse">Loading your data…</p>
            ) : myData ? (
              <CompareBar trader={data} mine={myData} />
            ) : (
              <p className="text-xs text-red-400">Could not load your data.</p>
            )}
          </div>
        )}

        {/* Dashboard */}
        {data && data.tradeCount > 0 && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Last {daysBack} days</span>
              <span>
                {data.tradeCount} trades · {data.fillCount} fills · fetched{" "}
                {new Date(data.fetchedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Stat cards */}
            <StatGrid stats={data.insights.general} />

            {/* Direction + RR + TPSL + RecentWR */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <DirectionCard insight={data.insights.directionWinRate} />
              <RRCard insight={data.insights.rr} />
              <TPSLCard insight={data.insights.tpsl} />
              <RecentWRCard insight={data.insights.recentWinRate} />
            </div>

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

            {/* Funding + Buy & hold */}
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
