import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCachedSync } from "@/lib/db-cache";
import TraderClient from "./TraderClient";

const DAYS_BACK = 90;

type Props = {
  params: Promise<{ locale: string; address: string }>;
};

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const cached = await getCachedSync(address, DAYS_BACK);

  if (cached && cached.tradeCount > 0) {
    const { tradeCount, insights } = cached;
    const wr = (insights.general.winRate * 100).toFixed(0);
    const pnl = insights.general.totalPnl;
    const pnlStr = `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    const short = abbrev(address);

    return {
      title: `Trader ${short} — ${tradeCount} trades, ${wr}% WR | Steady`,
      description: `${pnlStr} PnL · ${tradeCount} trades · ${wr}% win rate on Hyperliquid. Analyzed with Steady.`,
      openGraph: {
        title: `Trader ${short} | Steady`,
        description: `${pnlStr} PnL · ${tradeCount} trades · ${wr}% WR`,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `Trader ${short} | Steady`,
        description: `${pnlStr} PnL · ${tradeCount} trades · ${wr}% WR`,
      },
    };
  }

  return {
    title: "Trader Profile | Steady",
    description: "Hyperliquid trader analytics — no wallet connection required.",
    twitter: { card: "summary" },
  };
}

export default async function TraderPage({ params }: Props) {
  const { locale, address } = await params;
  setRequestLocale(locale);

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(address);
  if (!isValidAddress) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-mono text-sm">Invalid address.</p>
      </div>
    );
  }

  const initialData = await getCachedSync(address, DAYS_BACK);

  return <TraderClient address={address} initialData={initialData} daysBack={DAYS_BACK} />;
}
