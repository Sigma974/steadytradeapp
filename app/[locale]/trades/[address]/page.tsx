import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCachedSync } from "@/lib/db-cache";
import TradesClient from "./TradesClient";

type Props = {
  params: Promise<{ locale: string; address: string }>;
  searchParams: Promise<{ days?: string }>;
};

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { address } = await params;
  const { days } = await searchParams;
  const daysBack = Number(days) || 90;
  const short = abbrev(address);

  const cached = await getCachedSync(address, daysBack);
  const count = cached?.tradeCount ?? 0;

  const title = count > 0
    ? `${count} trades — ${short} · Steady`
    : `Trades — ${short} · Steady`;
  const description = `Full trade history for ${address} on Hyperliquid — analyzed by Steady.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function TradesPage({ params, searchParams }: Props) {
  const { locale, address } = await params;
  const { days } = await searchParams;
  setRequestLocale(locale);

  const daysBack = Number(days) || 90;

  const isValid = /^0x[0-9a-fA-F]{40}$/.test(address);
  if (!isValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 font-mono text-sm">Invalid address.</p>
      </div>
    );
  }

  const initialData = await getCachedSync(address, daysBack);
  return <TradesClient address={address} initialData={initialData} daysBack={daysBack} />;
}
