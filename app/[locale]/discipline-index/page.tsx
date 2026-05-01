import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabase as db } from "@/lib/supabase";
import { getScoreTier } from "@/lib/score-tiers";

type Props = { params: Promise<{ locale: string }> };

// ── helpers ─────────────────────────────────────────────────────────────────

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtPnl(pnl: number) {
  const abs = Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return {
    text: `${pnl >= 0 ? "+" : "-"}$${abs}`,
    cls: pnl >= 0 ? "text-teal-400" : "text-red-400",
  };
}

// ── metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DisciplineIndex" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function DisciplineIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "DisciplineIndex" });
  const tVerdict = await getTranslations({ locale, namespace: "Cards.Verdict" });
  const tScore = await getTranslations({ locale, namespace: "Cards.SteadyScore" });

  // Latest snapshot date
  const { data: latestRow } = await db
    .from("leaderboard_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // All ranked rows for that date, joined with wallet info
  type Row = {
    rank: number;
    wallet_address: string;
    steady_score: number;
    verdict: string | null;
    pnl_net: number;
    win_rate: number;
    trades_count: number;
    twitter_handle: string | null;
  };

  const rows: Row[] = [];

  if (latestRow) {
    const { data: snapshots } = await db
      .from("leaderboard_snapshots")
      .select(`
        rank,
        wallet_address,
        steady_score,
        verdict,
        pnl_net,
        win_rate,
        trades_count,
        leaderboard_wallets ( twitter_handle )
      `)
      .eq("snapshot_date", latestRow.snapshot_date)
      .order("rank", { ascending: true });

    if (snapshots) {
      for (const s of snapshots) {
        const w = s.leaderboard_wallets as unknown as { twitter_handle: string | null } | null;
        rows.push({
          rank: s.rank,
          wallet_address: s.wallet_address,
          steady_score: s.steady_score,
          verdict: s.verdict,
          pnl_net: Number(s.pnl_net),
          win_rate: Number(s.win_rate),
          trades_count: s.trades_count,
          twitter_handle: w?.twitter_handle ?? null,
        });
      }
    }
  }

  // Authenticated user's wallets for row highlighting
  let userAddresses = new Set<string>();
  try {
    const userSupa = await createSupabaseServer();
    const {
      data: { user },
    } = await userSupa.auth.getUser();
    if (user) {
      const { data: wallets } = await userSupa
        .from("user_wallets")
        .select("address")
        .eq("user_id", user.id);
      if (wallets) userAddresses = new Set(wallets.map((w) => w.address.toLowerCase()));
    }
  } catch {
    // Not authenticated — no highlighting
  }

  // "Last refresh" label derived from snapshot_date
  let lastRefresh: string | null = null;
  if (latestRow) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const d = latestRow.snapshot_date;
    if (d >= today) {
      lastRefresh = t("refreshToday");
    } else if (d === yesterday) {
      lastRefresh = t("refreshYesterday");
    } else {
      const n = Math.floor(
        (Date.now() - new Date(d + "T12:00:00Z").getTime()) / 86400000
      );
      lastRefresh = t("refreshDaysAgo", { n });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SiteHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            {t("title")}
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mb-3">
            {t("subtitle")}
          </p>
          <div className="text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span>
              {t("updatedDaily")}
              {lastRefresh && (
                <>
                  {" · "}
                  {t("lastRefresh")}:{" "}
                  <span className="text-slate-400">{lastRefresh}</span>
                </>
              )}
            </span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span>{t("minRequirement")}</span>
          </div>
        </div>

        {/* Leaderboard table */}
        {rows.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-20">
            {t("noData")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  {[
                    { label: t("colRank"), align: "left", cls: "w-12" },
                    { label: t("colTrader"), align: "left", cls: "" },
                    { label: t("colScore"), align: "right", cls: "" },
                    { label: t("colVerdict"), align: "left", cls: "hidden sm:table-cell" },
                    { label: t("colPnl"), align: "right", cls: "" },
                    { label: t("colWinRate"), align: "right", cls: "hidden md:table-cell" },
                    { label: t("colTrades"), align: "right", cls: "hidden md:table-cell" },
                  ].map(({ label, align, cls }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-${align} ${cls}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((row) => {
                  const isMe = userAddresses.has(row.wallet_address.toLowerCase());
                  const pnl = fmtPnl(row.pnl_net);
                  const verdictTitle = row.verdict
                    ? tVerdict(`${row.verdict}.title` as Parameters<typeof tVerdict>[0])
                    : null;

                  return (
                    <tr
                      key={row.wallet_address}
                      className={
                        isMe
                          ? "bg-teal-950/40 ring-1 ring-inset ring-teal-500/20"
                          : "hover:bg-slate-900/40 transition-colors"
                      }
                    >
                      {/* Rank */}
                      <td className="px-4 py-4">
                        <span className="text-slate-500 font-mono text-xs tabular-nums">
                          {row.rank}
                        </span>
                      </td>

                      {/* Trader */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/trader/${row.wallet_address}`}
                          className="group flex flex-col gap-0.5"
                        >
                          <span className="font-mono text-sm text-slate-200 group-hover:text-white transition-colors">
                            {abbrev(row.wallet_address)}
                          </span>
                          {row.twitter_handle && (
                            <span className="text-xs text-slate-500">
                              @{row.twitter_handle}
                            </span>
                          )}
                          {isMe && (
                            <span className="text-xs text-teal-400 font-medium">
                              {t("you")}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Steady Score */}
                      <td className="px-4 py-4 text-right">
                        <Link href={`/trader/${row.wallet_address}`} className="block">
                          <span
                            className={`font-bold text-base tabular-nums ${getScoreTier(row.steady_score).tailwindText}`}
                          >
                            {row.steady_score}
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                            {tScore(
                              `labels.${getScoreTier(row.steady_score).key}` as Parameters<typeof tScore>[0]
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Verdict */}
                      <td className="px-4 py-4 hidden sm:table-cell max-w-[200px]">
                        <Link href={`/trader/${row.wallet_address}`} className="block">
                          <span className="text-slate-300 text-xs leading-snug line-clamp-2">
                            {verdictTitle ?? (
                              <span className="text-slate-600">—</span>
                            )}
                          </span>
                        </Link>
                      </td>

                      {/* Net P&L */}
                      <td className="px-4 py-4 text-right">
                        <Link href={`/trader/${row.wallet_address}`} className="block">
                          <span className={`font-mono text-sm tabular-nums ${pnl.cls}`}>
                            {pnl.text}
                          </span>
                        </Link>
                      </td>

                      {/* Win rate */}
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <Link href={`/trader/${row.wallet_address}`} className="block">
                          <span className="text-slate-300 font-mono text-sm tabular-nums">
                            {(row.win_rate * 100).toFixed(0)}%
                          </span>
                        </Link>
                      </td>

                      {/* Trades */}
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <Link href={`/trader/${row.wallet_address}`} className="block">
                          <span className="text-slate-400 font-mono text-sm tabular-nums">
                            {row.trades_count}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer locale={locale} />
    </div>
  );
}
