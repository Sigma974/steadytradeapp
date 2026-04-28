import { hlFetch, sleep } from "./hl-fetch";

const EPSILON = 1e-8;

export type Side = "long" | "short";

export interface Fill {
  coin: string;
  sideRaw: string; // "B" (buy) or "A" (ask/sell)
  px: number;
  sz: number;
  timeMs: number;
  fee: number;
  closedPnl: number;
  dir: string; // "Open Long" / "Open Short" / "Close Long" / "Long > Short" / etc.
  oid: number;
  tid: number;
  builderFee: number;
}

export interface Trade {
  coin: string;
  side: Side;
  openAt: Date;
  closeAt: Date;
  durationSeconds: number;
  avgEntryPx: number;
  avgExitPx: number;
  size: number;
  notional: number;
  realizedPnl: number;
  feesTotal: number;
  pnlNet: number;
  isWinner: boolean;
  numFills: number;
  fills: Fill[];
}

interface OpenPosition {
  coin: string;
  signedSize: number; // positive = long, negative = short
  avgEntryPx: number;
  openAt: Date | null;
  fills: Fill[];
  realizedPnlAccumulated: number;
  feesAccumulated: number;
}

function fillSignedSize(fill: Fill): number {
  return fill.sideRaw === "B" ? fill.sz : -fill.sz;
}

function isOpening(fill: Fill): boolean {
  return fill.dir.startsWith("Open") || fill.dir.includes(">");
}

function posIsOpen(pos: OpenPosition): boolean {
  return Math.abs(pos.signedSize) > EPSILON;
}

function posSide(pos: OpenPosition): Side {
  return pos.signedSize > 0 ? "long" : "short";
}

function emitTrade(pos: OpenPosition, exitPx: number, closeAt: Date): Trade {
  const side =
    Math.abs(pos.signedSize) > EPSILON
      ? posSide(pos)
      : pos.fills[0].dir.endsWith("Long")
      ? "long"
      : "short";

  const size = Math.abs(
    pos.fills
      .filter(isOpening)
      .reduce((sum, f) => sum + fillSignedSize(f), 0)
  );

  const openAt = pos.openAt!;
  return {
    coin: pos.coin,
    side,
    openAt,
    closeAt,
    durationSeconds: Math.floor((closeAt.getTime() - openAt.getTime()) / 1000),
    avgEntryPx: pos.avgEntryPx,
    avgExitPx: exitPx,
    size,
    notional: pos.avgEntryPx * size,
    realizedPnl: pos.realizedPnlAccumulated,
    feesTotal: pos.feesAccumulated,
    pnlNet: pos.realizedPnlAccumulated - pos.feesAccumulated,
    isWinner: pos.realizedPnlAccumulated - pos.feesAccumulated > 0,
    numFills: pos.fills.length,
    fills: [...pos.fills],
  };
}

function freshPos(coin: string): OpenPosition {
  return {
    coin,
    signedSize: 0,
    avgEntryPx: 0,
    openAt: null,
    fills: [],
    realizedPnlAccumulated: 0,
    feesAccumulated: 0,
  };
}

export function reconstructTrades(fills: Fill[]): Trade[] {
  const sorted = [...fills].sort((a, b) => {
    if (a.coin !== b.coin) return a.coin.localeCompare(b.coin);
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return a.tid - b.tid;
  });

  const byCoin: Record<string, Fill[]> = {};
  for (const f of sorted) {
    (byCoin[f.coin] ??= []).push(f);
  }

  const trades: Trade[] = [];

  for (const [coin, coinFills] of Object.entries(byCoin)) {
    let pos = freshPos(coin);

    for (const fill of coinFills) {
      const fs = fillSignedSize(fill);

      // Case A — no open position, this fill opens one
      if (!posIsOpen(pos)) {
        pos.signedSize = fs;
        pos.avgEntryPx = fill.px;
        pos.openAt = new Date(fill.timeMs);
        pos.fills = [fill];
        pos.realizedPnlAccumulated = 0;
        pos.feesAccumulated = fill.fee;
        continue;
      }

      const sameDir =
        (pos.signedSize > 0 && fs > 0) || (pos.signedSize < 0 && fs < 0);

      if (sameDir) {
        // Case B — scale in: recompute weighted average entry
        const oldAbs = Math.abs(pos.signedSize);
        const addAbs = Math.abs(fs);
        pos.avgEntryPx =
          (pos.avgEntryPx * oldAbs + fill.px * addAbs) / (oldAbs + addAbs);
        pos.signedSize += fs;
        pos.fills.push(fill);
        pos.feesAccumulated += fill.fee;
        continue;
      }

      // Case C — opposite direction: partial close, full close, or flip
      const newSigned = pos.signedSize + fs;
      pos.realizedPnlAccumulated += fill.closedPnl;
      pos.feesAccumulated += fill.fee;
      pos.fills.push(fill);

      if (Math.abs(newSigned) <= EPSILON) {
        // Exactly closed
        trades.push(emitTrade(pos, fill.px, new Date(fill.timeMs)));
        pos = freshPos(coin);
      } else if (
        (pos.signedSize > 0 && newSigned > 0) ||
        (pos.signedSize < 0 && newSigned < 0)
      ) {
        // Partial close — same direction, just reduce size
        pos.signedSize = newSigned;
      } else {
        // Flip — close existing trade, open new one with the residual.
        // Fee is fully charged to the closing trade (see Python comment).
        trades.push(emitTrade(pos, fill.px, new Date(fill.timeMs)));
        pos = {
          coin,
          signedSize: newSigned,
          avgEntryPx: fill.px,
          openAt: new Date(fill.timeMs),
          fills: [fill],
          realizedPnlAccumulated: 0,
          feesAccumulated: 0,
        };
      }
    }
  }

  trades.sort((a, b) => a.closeAt.getTime() - b.closeAt.getTime());
  return trades;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

export function fillFromApiDict(raw: Record<string, unknown>): Fill {
  return {
    coin: raw.coin as string,
    sideRaw: raw.side as string,
    px: parseFloat(raw.px as string),
    sz: parseFloat(raw.sz as string),
    timeMs: raw.time as number,
    fee: parseFloat((raw.fee as string) ?? "0"),
    closedPnl: parseFloat((raw.closedPnl as string) ?? "0"),
    dir: (raw.dir as string) ?? "",
    oid: raw.oid as number,
    tid: raw.tid as number,
    builderFee: parseFloat((raw.builderFee as string) ?? "0"),
  };
}

export async function fetchUserFills(
  address: string,
  startTime: Date,
  endTime?: Date
): Promise<Fill[]> {
  const payload: Record<string, unknown> = {
    type: "userFillsByTime",
    user: address,
    startTime: startTime.getTime(),
  };
  if (endTime) payload.endTime = endTime.getTime();

  const allFills: Fill[] = [];
  const seenTids = new Set<number>();

  while (true) {
    const batch = (await hlFetch(payload)) as Record<string, unknown>[];

    if (!batch.length) break;

    const newFills: Fill[] = [];
    for (const raw of batch) {
      const tid = raw.tid as number;
      if (seenTids.has(tid)) continue;
      seenTids.add(tid);
      newFills.push(fillFromApiDict(raw));
    }

    if (!newFills.length) break;

    allFills.push(...newFills);

    if (batch.length < 2000) break;

    // Paginate: advance startTime past the last seen fill.
    // Small pause to stay well under Hyperliquid's rate limit.
    const latestTime = Math.max(...newFills.map((f) => f.timeMs));
    payload.startTime = latestTime + 1;
    await sleep(150);
  }

  return allFills;
}

// ---------------------------------------------------------------------------
// Self-tests (mirror of the Python prototype)
// ---------------------------------------------------------------------------

function makeFill(
  fields: Omit<Fill, "builderFee"> & { builderFee?: number }
): Fill {
  return { builderFee: 0, ...fields };
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function testSimpleLong(): void {
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "B", px: 100, sz: 1, timeMs: 1000, fee: 0.05, closedPnl: 0, dir: "Open Long", oid: 1, tid: 1 }),
    makeFill({ coin: "BTC", sideRaw: "A", px: 110, sz: 1, timeMs: 2000, fee: 0.055, closedPnl: 10, dir: "Close Long", oid: 2, tid: 2 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 1, "expected 1 trade");
  const t = trades[0];
  assert(t.side === "long", "side");
  assert(near(t.avgEntryPx, 100), "avgEntryPx");
  assert(near(t.avgExitPx, 110), "avgExitPx");
  assert(near(t.size, 1), "size");
  assert(near(t.realizedPnl, 10), "realizedPnl");
  assert(near(t.feesTotal, 0.105), "feesTotal");
  assert(near(t.pnlNet, 9.895), "pnlNet");
  console.log("PASS: simple long");
}

function testScaleInThenClose(): void {
  const fills = [
    makeFill({ coin: "ETH", sideRaw: "B", px: 1000, sz: 1, timeMs: 1000, fee: 0.5, closedPnl: 0, dir: "Open Long", oid: 1, tid: 1 }),
    makeFill({ coin: "ETH", sideRaw: "B", px: 1100, sz: 1, timeMs: 1500, fee: 0.55, closedPnl: 0, dir: "Open Long", oid: 2, tid: 2 }),
    makeFill({ coin: "ETH", sideRaw: "A", px: 1200, sz: 2, timeMs: 2000, fee: 1.2, closedPnl: 300, dir: "Close Long", oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 1, "expected 1 trade");
  const t = trades[0];
  assert(near(t.avgEntryPx, 1050), "avgEntryPx (weighted avg 1000+1100)/2");
  assert(near(t.size, 2), "size");
  assert(near(t.realizedPnl, 300), "realizedPnl");
  console.log("PASS: scale in then close");
}

function testPartialClose(): void {
  const fills = [
    makeFill({ coin: "SOL", sideRaw: "B", px: 100, sz: 2, timeMs: 1000, fee: 0.1, closedPnl: 0, dir: "Open Long", oid: 1, tid: 1 }),
    makeFill({ coin: "SOL", sideRaw: "A", px: 110, sz: 1, timeMs: 2000, fee: 0.055, closedPnl: 10, dir: "Close Long", oid: 2, tid: 2 }),
    makeFill({ coin: "SOL", sideRaw: "A", px: 120, sz: 1, timeMs: 3000, fee: 0.06, closedPnl: 20, dir: "Close Long", oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 1, "expected 1 trade");
  const t = trades[0];
  assert(near(t.realizedPnl, 30), "realizedPnl");
  assert(near(t.feesTotal, 0.215), "feesTotal");
  assert(t.fills.length === 3, "3 fills");
  console.log("PASS: partial close (2 closes, 1 trade)");
}

function testFlip(): void {
  const fills = [
    makeFill({ coin: "DOGE", sideRaw: "B", px: 0.10, sz: 100, timeMs: 1000, fee: 0.01, closedPnl: 0, dir: "Open Long", oid: 1, tid: 1 }),
    makeFill({ coin: "DOGE", sideRaw: "A", px: 0.12, sz: 200, timeMs: 2000, fee: 0.024, closedPnl: 2, dir: "Long > Short", oid: 2, tid: 2 }),
    makeFill({ coin: "DOGE", sideRaw: "B", px: 0.11, sz: 100, timeMs: 3000, fee: 0.011, closedPnl: 1, dir: "Close Short", oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 2, `expected 2 trades, got ${trades.length}`);
  const longT = trades[0];
  const shortT = trades[1];
  assert(longT.side === "long", "longT.side");
  assert(near(longT.size, 100), "longT.size");
  assert(near(longT.realizedPnl, 2), "longT.realizedPnl");
  assert(shortT.side === "short", "shortT.side");
  assert(near(shortT.realizedPnl, 1), "shortT.realizedPnl");
  console.log("PASS: flip from long to short");
}

function testShortTrade(): void {
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "A", px: 100, sz: 1, timeMs: 1000, fee: 0.05, closedPnl: 0, dir: "Open Short", oid: 1, tid: 1 }),
    makeFill({ coin: "BTC", sideRaw: "B", px: 90, sz: 1, timeMs: 2000, fee: 0.045, closedPnl: 10, dir: "Close Short", oid: 2, tid: 2 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 1, "expected 1 trade");
  const t = trades[0];
  assert(t.side === "short", "side");
  assert(near(t.pnlNet, 9.905), "pnlNet");
  console.log("PASS: short trade");
}

function testMultiAsset(): void {
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "B", px: 100, sz: 1, timeMs: 1000, fee: 0, closedPnl: 0, dir: "Open Long", oid: 1, tid: 1 }),
    makeFill({ coin: "ETH", sideRaw: "B", px: 3000, sz: 1, timeMs: 1100, fee: 0, closedPnl: 0, dir: "Open Long", oid: 2, tid: 2 }),
    makeFill({ coin: "BTC", sideRaw: "A", px: 110, sz: 1, timeMs: 2000, fee: 0, closedPnl: 10, dir: "Close Long", oid: 3, tid: 3 }),
    makeFill({ coin: "ETH", sideRaw: "A", px: 3100, sz: 1, timeMs: 2100, fee: 0, closedPnl: 100, dir: "Close Long", oid: 4, tid: 4 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 2, "expected 2 trades");
  const btc = trades.find((t) => t.coin === "BTC")!;
  const eth = trades.find((t) => t.coin === "ETH")!;
  assert(near(btc.realizedPnl, 10), "BTC realizedPnl");
  assert(near(eth.realizedPnl, 100), "ETH realizedPnl");
  console.log("PASS: multi-asset independence");
}

export function runTests(): void {
  testSimpleLong();
  testScaleInThenClose();
  testPartialClose();
  testFlip();
  testShortTrade();
  testMultiAsset();
  console.log("\nAll tests passed.");
}
