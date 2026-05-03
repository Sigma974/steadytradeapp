import { setRequestLocale } from "next-intl/server";
import { getCachedSync } from "@/lib/db-cache";
import { PERIODS, DEFAULT_DAYS } from "@/lib/periods";
import SiteHeader from "@/components/SiteHeader";
import VsClient from "./VsClient";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

type Props = {
  params: Promise<{ locale: string; wallet1: string; wallet2: string }>;
  searchParams: Promise<{
    period?: string; from?: string; to?: string;
    days?: string; start?: string; end?: string;
  }>;
};

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <p className="text-red-400 text-sm font-medium">{message}</p>
        <p className="text-slate-600 text-xs font-mono">
          Expected: 0x followed by 40 hex characters
        </p>
      </div>
    </div>
  );
}

export default async function VsPage({ params, searchParams }: Props) {
  const { locale, wallet1, wallet2 } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const w1Valid = WALLET_RE.test(wallet1);
  const w2Valid = WALLET_RE.test(wallet2);

  if (!w1Valid || !w2Valid) {
    const message =
      !w1Valid && !w2Valid
        ? "Invalid wallet addresses."
        : !w1Valid
          ? `Invalid wallet address: ${wallet1}`
          : `Invalid wallet address: ${wallet2}`;
    return <ErrorPage message={message} />;
  }

  // Parse period — same logic as TraderPage
  let initialDays: number | null = DEFAULT_DAYS;
  let initialStart: number | undefined;
  let initialEnd: number | undefined;

  if (sp.period) {
    if (sp.period === "custom" && sp.from && sp.to) {
      const s = new Date(sp.from + "T00:00:00Z").getTime();
      const e = new Date(sp.to + "T23:59:59Z").getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        initialDays = null;
        initialStart = s;
        initialEnd = e;
      }
    } else {
      const found = PERIODS.find((p) => p.key === sp.period);
      initialDays = found ? found.daysBack : DEFAULT_DAYS;
    }
  } else if (sp.start && sp.end) {
    const s = parseInt(sp.start, 10);
    const e = parseInt(sp.end, 10);
    if (!isNaN(s) && !isNaN(e) && e > s) {
      initialDays = null;
      initialStart = s;
      initialEnd = e;
    }
  } else if (sp.days) {
    const parsed = parseInt(sp.days, 10);
    initialDays = isNaN(parsed) || parsed <= 0 ? DEFAULT_DAYS : parsed;
  }

  // Fetch both wallets in parallel from server-side cache
  const [initialData1, initialData2] = initialDays !== null
    ? await Promise.all([
        getCachedSync(wallet1, initialDays),
        getCachedSync(wallet2, initialDays),
      ])
    : [null, null];

  return (
    <VsClient
      address1={wallet1}
      address2={wallet2}
      initialData1={initialData1}
      initialData2={initialData2}
      initialDays={initialDays}
      initialStart={initialStart}
      initialEnd={initialEnd}
    />
  );
}
