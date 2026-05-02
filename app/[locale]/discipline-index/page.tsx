import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabase as db } from "@/lib/supabase";
import { LeaderboardClient, type Row } from "./LeaderboardClient";

type Props = { params: Promise<{ locale: string }> };

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

  // Latest snapshot date
  const { data: latestRow } = await db
    .from("leaderboard_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // All ranked rows for that date, joined with wallet info
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
        leaderboard_wallets ( twitter_handle, claimed_status )
      `)
      .eq("snapshot_date", latestRow.snapshot_date)
      .order("rank", { ascending: true });

    if (snapshots) {
      for (const s of snapshots) {
        const w = s.leaderboard_wallets as unknown as {
          twitter_handle: string | null;
          claimed_status: string | null;
        } | null;
        rows.push({
          rank: s.rank,
          wallet_address: s.wallet_address,
          steady_score: s.steady_score,
          verdict: s.verdict,
          pnl_net: Number(s.pnl_net),
          win_rate: Number(s.win_rate),
          trades_count: s.trades_count,
          twitter_handle: w?.twitter_handle ?? null,
          claimed_status: w?.claimed_status ?? null,
        });
      }
    }
  }

  // Authenticated user's wallets for row highlighting
  let userAddresses: string[] = [];
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
      if (wallets) userAddresses = wallets.map((w) => w.address.toLowerCase());
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

        {/* Table + modals (client component) */}
        <LeaderboardClient rows={rows} userAddresses={userAddresses} />

      </main>

      <Footer locale={locale} />
    </div>
  );
}
