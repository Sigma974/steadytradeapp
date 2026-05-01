import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCachedSync } from "@/lib/db-cache";
import { calculateSteadyScore } from "@/lib/insights/steadyScore";
import TraderClient from "./TraderClient";

const META_DAYS = 90;

type Props = {
  params: Promise<{ locale: string; address: string }>;
  searchParams: Promise<{ days?: string; start?: string; end?: string }>;
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

  let initialDays: number | null;
  let initialStart: number | undefined;
  let initialEnd: number | undefined;

  if (sp.start && sp.end) {
    initialDays = null;
    initialStart = parseInt(sp.start, 10) || undefined;
    initialEnd = parseInt(sp.end, 10) || undefined;
  } else {
    const parsed = sp.days ? parseInt(sp.days, 10) : 90;
    initialDays = isNaN(parsed) || parsed <= 0 ? 90 : parsed;
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
