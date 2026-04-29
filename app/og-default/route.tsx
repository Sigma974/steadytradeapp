import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  try {
    const fontBold = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff"
    ).then((r) => r.arrayBuffer());

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
            backgroundColor: "#020617",
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-3px",
              lineHeight: 1,
              fontFamily: "Inter",
            }}
          >
            Steady
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#94a3b8",
              marginTop: 28,
              fontFamily: "Inter",
            }}
          >
            Honest analytics for Hyperliquid traders
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 48,
              right: 60,
              fontSize: 24,
              color: "#64748b",
              fontFamily: "Inter",
            }}
          >
            steadytrade.org
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: fontBold,
            weight: 700,
            style: "normal",
          },
        ],
      }
    );
  } catch {
    return new Response("Failed to generate image", { status: 500 });
  }
}
