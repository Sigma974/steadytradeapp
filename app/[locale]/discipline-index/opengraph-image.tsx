import { ImageResponse } from "next/og";
import { supabase as db } from "@/lib/supabase";
import { getScoreTier } from "@/lib/score-tiers";

export const alt = "Steady Discipline Index — Hyperliquid trader leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type TopRow = { rank: number; address: string; score: number; handle: string | null };

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const RANK_COLORS = ["#fbbf24", "#94a3b8", "#c2855a"];

export default async function Image({
  params: _params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [fontBold, fontRegular] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff").then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff").then((r) => r.arrayBuffer()),
  ]);

  const fonts = [
    { name: "Inter", data: fontBold,    weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: fontRegular, weight: 400 as const, style: "normal" as const },
  ];

  const { data: latestRow } = await db
    .from("leaderboard_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let top3: TopRow[] = [];
  let totalCount = 0;

  if (latestRow) {
    const [snapResult, countResult] = await Promise.all([
      db
        .from("leaderboard_snapshots")
        .select("rank, wallet_address, steady_score, leaderboard_wallets(twitter_handle, claimed_status)")
        .eq("snapshot_date", latestRow.snapshot_date)
        .order("rank", { ascending: true })
        .limit(3),
      db
        .from("leaderboard_snapshots")
        .select("rank", { count: "exact", head: true })
        .eq("snapshot_date", latestRow.snapshot_date),
    ]);

    totalCount = countResult.count ?? 0;
    if (snapResult.data) {
      top3 = snapResult.data.map((s) => {
        const w = s.leaderboard_wallets as unknown as { twitter_handle: string | null; claimed_status: string | null } | null;
        return {
          rank: s.rank,
          address: s.wallet_address,
          score: s.steady_score,
          handle: w?.twitter_handle ?? null,
        };
      });
    }
  }

  const bg = "#020617";

  // Fallback — no data yet
  if (top3.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: bg,
            fontFamily: "Inter",
          }}
        >
          <div style={{ display: "flex", fontSize: 110, fontWeight: 700, color: "#ffffff", letterSpacing: "-3px", lineHeight: 1 }}>
            Steady
          </div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#94a3b8", marginTop: 24 }}>
            Discipline Index
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#475569", marginTop: 14 }}>
            The honest leaderboard for Hyperliquid traders
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          paddingTop: 44,
          paddingBottom: 40,
          paddingLeft: 60,
          paddingRight: 60,
          backgroundColor: bg,
          fontFamily: "Inter",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#ffffff", letterSpacing: "-1px" }}>
            Steady
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#334155" }}>
            steadytrade.org/discipline-index
          </div>
        </div>

        {/* Middle — fills remaining height, centers content vertically */}
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", paddingTop: 8, paddingBottom: 8 }}>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", fontSize: 82, fontWeight: 700, color: "#ffffff", letterSpacing: "-2px", lineHeight: 1 }}>
              Discipline Index
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#94a3b8", marginTop: 12 }}>
              The honest leaderboard for Hyperliquid traders
            </div>
          </div>

          {/* Separator */}
          <div style={{ display: "flex", height: 1, backgroundColor: "#1e293b", marginBottom: 8 }} />

          {/* Top 3 rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {top3.map((row, i) => {
              const tier = getScoreTier(row.score);
              const identity = row.handle ? `@${row.handle}` : abbrev(row.address);
              const rankColor = RANK_COLORS[i] ?? "#94a3b8";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", paddingTop: 18, paddingBottom: 18 }}>
                    {/* Rank */}
                    <div style={{ display: "flex", width: 72, fontSize: 28, fontWeight: 700, color: rankColor }}>
                      {"#" + String(row.rank)}
                    </div>
                    {/* Identity */}
                    <div style={{ display: "flex", flex: 1, fontSize: 22, color: "#cbd5e1" }}>
                      {identity}
                    </div>
                    {/* Score + /100 */}
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: 28 }}>
                      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: tier.colorHex, marginRight: 6 }}>
                        {String(row.score)}
                      </div>
                      <div style={{ display: "flex", fontSize: 16, color: "#475569" }}>
                        /100
                      </div>
                    </div>
                    {/* Tier badge */}
                    <div
                      style={{
                        display: "flex",
                        width: 248,
                        justifyContent: "center",
                        backgroundColor: tier.bgHex,
                        border: "1px solid " + tier.borderHex,
                        borderRadius: 6,
                        paddingTop: 7,
                        paddingBottom: 7,
                        paddingLeft: 14,
                        paddingRight: 14,
                        fontSize: 17,
                        color: tier.colorHex,
                      }}
                    >
                      {tier.icon + "  " + tier.labelEn}
                    </div>
                  </div>
                  {i < top3.length - 1 && (
                    <div style={{ display: "flex", height: 1, backgroundColor: "#0f172a" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 1, backgroundColor: "#1e293b", marginBottom: 18 }} />
          <div style={{ display: "flex", justifyContent: "center", fontSize: 18, color: "#475569" }}>
            {`${totalCount} trader${totalCount !== 1 ? "s" : ""} ranked · Updated daily`}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
