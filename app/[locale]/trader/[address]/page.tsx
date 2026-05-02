import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCachedSync } from "@/lib/db-cache";
import { calculateSteadyScore } from "@/lib/insights/steadyScore";
import { PERIODS, DEFAULT_DAYS } from "@/lib/periods";
import TraderClient from "./TraderClient";

const META_DAYS = DEFAULT_DAYS;

type Props = {
  params: Promise<{ locale: string; address: string }>;
  searchParams: Promise<{
    // New format
    period?: string; from?: string; to?: string;
    // Backward compat
    days?: string; start?: string; end?: string;
  }>;
};

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const cached = await getCachedSync(address, META_DAYS);

  if (cached && cached.tradeCount > 0) {
    const { tradeCount, insights } = cached;
    const wr = (insights.general.winRate * 100).toFixed(0);
    const pnl = insights.general.totalPnl;
    const pnlStr = `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    const short = abbrev(address);
    const scoreResult = calculateSteadyScore(cached);
    const scoreStr = scoreResult ? ` · Steady Score ${scoreResult.score}/100` : "";

    return {
      title: `Trader ${short} — ${tradeCount} trades, ${wr}% WR | Steady`,
      description: `${pnlStr} PnL · ${tradeCount} trades · ${wr}% win rate on Hyperliquid${scoreStr}. Analyzed with Steady.`,
      openGraph: {
        title: `Trader ${short} | Steady`,
        description: `${pnlStr} PnL · ${tradeCount} trades · ${wr}% WR${scoreStr}`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `Trader ${short} | Steady`,
        description: `${pnlStr} PnL · ${tradeCount} trades · ${wr}% WR${scoreStr}`,
      },
    };
  }

  return {
    title: "Trader Profile | Steady",
    description: "Hyperliquid trader analytics — no wallet connection required.",
    twitter: { card: "summary_large_image" },
  };
}

export default async function TraderPage({ params, searchParams }: Props) {
  const { locale, address } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(address);
  if (!isValidAddress) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-mono text-sm">Invalid address.</p>
      </div>
    );
  }

  let initialDays: number | null = DEFAULT_DAYS;
  let initialStart: number | undefined;
  let initialEnd: number | undefined;

  if (sp.period) {
    if (sp.period === "custom" && sp.from && sp.to) {
      // ?period=custom&from=2024-01-15&to=2024-03-20
      const s = new Date(sp.from + "T00:00:00Z").getTime();
      const e = new Date(sp.to + "T23:59:59Z").getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        initialDays = null;
        initialStart = s;
        initialEnd = e;
      }
      // else: invalid dates → fall through to default
    } else {
      // ?period=30d, ?period=all, etc. — unknown key falls back to default
      const found = PERIODS.find((p) => p.key === sp.period);
      initialDays = found ? found.daysBack : DEFAULT_DAYS;
    }
  } else if (sp.start && sp.end) {
    // Backward compat: old ?start=<ms>&end=<ms> format
    const s = parseInt(sp.start, 10);
    const e = parseInt(sp.end, 10);
    if (!isNaN(s) && !isNaN(e) && e > s) {
      initialDays = null;
      initialStart = s;
      initialEnd = e;
    }
  } else if (sp.days) {
    // Backward compat: old ?days=N format
    const parsed = parseInt(sp.days, 10);
    initialDays = isNaN(parsed) || parsed <= 0 ? DEFAULT_DAYS : parsed;
  }

  const initialData = initialDays !== null ? await getCachedSync(address, initialDays) : null;

  return (
    <TraderClient
      address={address}
      initialData={initialData}
      daysBack={initialDays}
      initialStart={initialStart}
      initialEnd={initialEnd}
    />
  );
}
