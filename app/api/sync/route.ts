import { NextRequest, NextResponse } from "next/server";
import {
  fetchUserFills,
  reconstructTrades,
  Fill,
  Trade,
} from "@/lib/trade-reconstruction";
import {
  computeGeneralStats,
  detectRevengeTrades,
  computeHourlyPerformance,
  computeBuyHoldComparison,
} from "@/lib/insights";
import {
  getCachedSync,
  setCachedSync,
  checkRateLimit,
  logRequest,
  pruneRateLimitLog,
} from "@/lib/db-cache";
import type { SyncData, SerializedRevengeInsight } from "@/lib/api-types";

interface SyncRequest {
  address: string;
  daysBack?: number;
  startTime?: number;
  endTime?: number;
  revengeWindowSeconds?: number;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function serializeFill(f: Fill) {
  return {
    coin: f.coin,
    sideRaw: f.sideRaw,
    px: f.px,
    sz: f.sz,
    timeMs: f.timeMs,
    fee: f.fee,
    closedPnl: f.closedPnl,
    dir: f.dir,
    oid: f.oid,
    tid: f.tid,
  };
}

function serializeTrade(t: Trade) {
  return {
    coin: t.coin,
    side: t.side,
    openAt: t.openAt.toISOString(),
    closeAt: t.closeAt.toISOString(),
    durationSeconds: t.durationSeconds,
    avgEntryPx: t.avgEntryPx,
    avgExitPx: t.avgExitPx,
    size: t.size,
    notional: t.notional,
    realizedPnl: t.realizedPnl,
    feesTotal: t.feesTotal,
    pnlNet: t.pnlNet,
    isWinner: t.isWinner,
    numFills: t.numFills,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  // Rate limit check
  const { allowed, remaining } = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": "0" },
      }
    );
  }

  let body: SyncRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    address,
    daysBack = 30,
    startTime,
    endTime,
    revengeWindowSeconds = 300,
  } = body;

  if (
    !address ||
    typeof address !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(address)
  ) {
    return NextResponse.json(
      { error: "address must be a valid 0x Ethereum address" },
      { status: 400 }
    );
  }

  // Cache hit — return immediately without counting against rate limit
  if (!startTime && !endTime) {
    const cached = await getCachedSync(address, daysBack);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-Cache": "HIT",
          "X-RateLimit-Remaining": String(remaining),
        },
      });
    }
  }

  // Cache miss — count the request and fetch from Hyperliquid
  await logRequest(ip);

  // Prune old rate limit rows ~10% of the time to keep the table small
  if (Math.random() < 0.1) pruneRateLimitLog();

  const start = startTime
    ? new Date(startTime)
    : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const end = endTime ? new Date(endTime) : undefined;

  try {
    const fills = await fetchUserFills(address, start, end);
    const trades = reconstructTrades(fills);
    const revenge = detectRevengeTrades(trades, revengeWindowSeconds);

    const serializedRevenge: SerializedRevengeInsight = {
      ...revenge,
      details: revenge.details.map((d) => ({
        gapSeconds: d.gapSeconds,
        trade: serializeTrade(d.trade),
        previousLoss: serializeTrade(d.previousLoss),
      })),
    };

    const response: SyncData = {
      address,
      fills: fills.map(serializeFill),
      trades: trades.map(serializeTrade),
      fillCount: fills.length,
      tradeCount: trades.length,
      fetchedAt: new Date().toISOString(),
      insights: {
        general: computeGeneralStats(trades),
        revengeTrades: serializedRevenge,
        hourlyPerformance: computeHourlyPerformance(trades),
        buyHold: computeBuyHoldComparison(trades),
      },
    };

    // Store in cache (non-blocking)
    if (!startTime && !endTime) {
      setCachedSync(address, daysBack, response);
    }

    return NextResponse.json(response, {
      headers: {
        "X-Cache": "MISS",
        "X-RateLimit-Remaining": String(remaining - 1),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
