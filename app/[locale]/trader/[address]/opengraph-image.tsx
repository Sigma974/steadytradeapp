import { ImageResponse } from "next/og";
import { getCachedSync } from "@/lib/db-cache";
import { calculateSteadyScore } from "@/lib/insights/steadyScore";
import { calculateVerdict } from "@/lib/insights/verdict";
import { getScoreTier } from "@/lib/score-tiers";

export const alt = "Trader analytics — Steady";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const VERDICT_TITLE: Record<string, string> = {
  revenge:        "Revenge trading is costing you",
  scalping:       "Quick trades aren't your edge",
  scalpingNoLong: "Quick trades aren't your edge",
  drawdown:       "Risk management needs attention",
  decliningWR:    "Recent performance slipping",
  longBias:       "Bias detected: longs work, shorts don't",
  funding:        "Funding fees are eating your gains",
  success:        "Solid performance",
  neutral:        "Mixed signals",
};

function abbrev(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtPnl(pnl: number): string {
  const abs = Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${pnl >= 0 ? "+" : "-"}$${abs}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; address: string }>;
}) {
  const { address } = await params;

  const [fontBold, fontRegular, cached] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff").then((r) => r.arrayBuffer()),
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff").then((r) => r.arrayBuffer()),
    getCachedSync(address, 90),
  ]);

  const fonts = [
    { name: "Inter", data: fontBold,    weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: fontRegular, weight: 400 as const, style: "normal" as const },
  ];

  const bg = "#020617";

  // ── Fallback: wallet not synced or not enough trades ──
  if (!cached || cached.tradeCount < 10) {
    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
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
          <div
            style={{
              display: "flex",
              fontSize: 120,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            Steady
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#94a3b8",
              marginTop: 28,
            }}
          >
            Honest analytics for Hyperliquid traders
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#475569",
              marginTop: 20,
            }}
          >
            {abbrev(address)}
          </div>
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 48,
              right: 60,
              fontSize: 18,
              color: "#334155",
            }}
          >
            steadytrade.org
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  }

  // ── Data image ──
  const scoreResult = calculateSteadyScore(cached);
  const verdict     = calculateVerdict(cached, null);

  const score        = scoreResult?.score    ?? 0;
  const tier         = getScoreTier(score);
  const scoreColor   = scoreResult ? tier.colorHex : "#94a3b8";
  const verdictTitle = verdict ? (VERDICT_TITLE[verdict.key] ?? "") : "";

  const { totalPnl, winRate, totalTrades } = cached.insights.general;
  const pnlStr   = fmtPnl(totalPnl);
  const wrStr    = `${(winRate * 100).toFixed(0)}%`;
  const pnlColor = totalPnl >= 0 ? "#2dd4bf" : "#ef4444";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          paddingTop: 48,
          paddingBottom: 40,
          paddingLeft: 60,
          paddingRight: 60,
          backgroundColor: bg,
          fontFamily: "Inter",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            Steady
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#64748b",
            }}
          >
            {abbrev(address)}
          </div>
        </div>

        {/* Center: score + verdict */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Badge — always visible, tone and color adapt to score tier */}
          <div
            style={{
              display: "flex",
              backgroundColor: tier.bgHex,
              border: "1px solid " + tier.borderHex,
              borderRadius: 6,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 18,
              paddingRight: 18,
              marginBottom: 20,
              fontSize: 20,
              color: tier.colorHex,
            }}
          >
            {tier.icon + "  " + tier.labelEn}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 180,
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1,
              letterSpacing: "-5px",
            }}
          >
            {String(score)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#94a3b8",
              marginTop: 8,
            }}
          >
            Steady Score
          </div>
          {verdictTitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                color: "#ffffff",
                marginTop: 20,
                textAlign: "center",
                maxWidth: 820,
                lineHeight: 1.3,
                maxHeight: 70,
                overflow: "hidden",
              }}
            >
              {verdictTitle}
            </div>
          ) : null}
        </div>

        {/* Separator */}
        <div
          style={{
            display: "flex",
            height: 1,
            backgroundColor: "#1e293b",
            marginBottom: 28,
          }}
        />

        {/* Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              {"Net P&L"}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: pnlColor,
              }}
            >
              {pnlStr}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              Win rate
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {wrStr}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              Trades
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {String(totalTrades)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 28,
            fontSize: 16,
            color: "#334155",
          }}
        >
          steadytrade.org
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
