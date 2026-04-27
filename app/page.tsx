"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SyncData } from "@/lib/api-types";
import StatGrid from "@/components/dashboard/StatGrid";
import RevengeCard from "@/components/dashboard/RevengeCard";
import HourlyGrid from "@/components/dashboard/HourlyGrid";
import BuyHoldTable from "@/components/dashboard/BuyHoldTable";

const DAYS_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function Home() {
  const [address, setAddress] = useState("");
  const [daysBack, setDaysBack] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SyncData | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), daysBack }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "An error occurred.");
        return;
      }

      setData(json as SyncData);
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-slate-100">Steady</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Hyperliquid analytics</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              className="font-mono bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 flex-1"
              placeholder="0x... Hyperliquid address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <select
              className="h-9 rounded-md border border-slate-700 bg-slate-900 text-slate-100 text-sm px-3 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500"
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
            >
              {DAYS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={loading || !address.trim()}
              className="bg-slate-100 text-slate-950 hover:bg-slate-200 font-semibold px-6"
            >
              {loading ? "Loading…" : "Analyze"}
            </Button>
          </div>

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
            {/* Meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-mono truncate">{data.address}</span>
              <span>
                {data.tradeCount} trades · {data.fillCount} fills · fetched{" "}
                {new Date(data.fetchedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Stat cards */}
            <StatGrid stats={data.insights.general} />

            {/* Revenge + Hourly */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RevengeCard insight={data.insights.revengeTrades} />
              <HourlyGrid insight={data.insights.hourlyPerformance} />
            </div>

            {/* Buy & hold */}
            {data.insights.buyHold.byCoin.length > 0 && (
              <BuyHoldTable insight={data.insights.buyHold} />
            )}

            {data.tradeCount === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                No closed trades found for this address in the selected period.
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div className="text-center py-24 space-y-2">
            <p className="text-slate-600 text-sm">
              Enter a Hyperliquid address to analyze trading performance.
            </p>
            <p className="text-slate-700 text-xs">
              Read-only — no wallet connection required.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
