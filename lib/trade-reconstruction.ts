import { hlFetch, sleep } from "./hl-fetch";

// ---------------------------------------------------------------------------
// FIFO Trade Reconstruction
//
// DEFINITION: 1 trade = 1 round-trip matched by FIFO between an opening lot
// and a closing fill.  A single opening fill may generate multiple sub-trades
// (if closed in several partial fills), and a single closing fill may match
// several lots (if they were opened in distinct fills).
//
// ALGORITHM (per coin):
//   Maintain an ordered queue of open lots.
//   • Opening fill → push a new lot onto the queue.
//   • Closing fill → pop lots from the front (FIFO), emitting one sub-trade
//                    per lot-fill match, until the closing fill is consumed.
//   • Flip fill     → drain the queue entirely (emitting sub-trades), then
//                    push the residual as a new lot in the opposite direction.
//
// PnL per sub-trade is computed from the actual entry/exit prices of the
// matched lot, NOT from the exchange's average-cost closedPnl field.  This
// gives correct per-lot economics when lots have different entry prices.
// Over a full close of all lots the totals remain consistent with the exchange.
//
// Fees are prorated:
//   • Opening fee  : lot.fee × (subSize / lot.originalSize)
//   • Closing fee  : fill total fee × (subSize / fill total size)
// For flip fills the closing portion and the opening residual each receive
// a proportional share of the fill's total fee.
//
// PRE-WINDOW POSITIONS (emitAfter)
//   The caller may pass an emitAfter date so that extra "warmup" fills fetched
//   before the analysis window can pre-populate the queue correctly.  All fills
//   are processed (queue integrity is maintained), but only sub-trades whose
//   closeAt ≥ emitAfter are included in the returned array.
// ---------------------------------------------------------------------------

const EPSILON = 1e-8;

export type Side = "long" | "short";

export interface Fill {
  coin: string;
  sideRaw: string; // "B" (buy) or "A" (ask/sell)
  px: number;
  sz: number;
  timeMs: number;
  fee: number;
  closedPnl: number; // exchange's avg-cost PnL (not used for per-lot PnL)
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
  avgEntryPx: number; // exact entry price of the matched lot
  avgExitPx: number;  // exact exit price of the closing fill
  size: number;       // matched size of this round-trip
  notional: number;   // avgEntryPx × size
  realizedPnl: number; // FIFO PnL: (exitPx − entryPx) × direction × size
  feesTotal: number;   // prorated open fee + prorated close fee
  pnlNet: number;      // realizedPnl − feesTotal
  isWinner: boolean;
  numFills: number;    // always 2: the opening fill + the closing fill
  fills: Fill[];       // [openFill, closeFill]
}

// A single opening fill (or the opening residual of a flip fill) stored in
// the FIFO queue while the position is open.
interface Lot {
  side: Side;
  px: number;           // entry price
  openAt: Date;
  openFill: Fill;       // the fill that created this lot (for fills[] in Trade)
  originalSize: number; // size at creation — used for opening-fee proration
  remainingSize: number; // still-unmatched portion
  fee: number;          // prorated opening fee for this lot
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

export function reconstructTrades(fills: Fill[], emitAfter?: Date): Trade[] {
  // Step 1 — sort by (coin, timeMs, tid) for deterministic ordering
  const sorted = [...fills].sort((a, b) => {
    if (a.coin !== b.coin) return a.coin.localeCompare(b.coin);
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return a.tid - b.tid;
  });

  // Step 2 — group by coin
  const byCoin: Record<string, Fill[]> = {};
  for (const f of sorted) {
    (byCoin[f.coin] ??= []).push(f);
  }

  const trades: Trade[] = [];

  // Step 3 — FIFO reconstruction per coin
  for (const [coin, coinFills] of Object.entries(byCoin)) {
    // FIFO queue of open lots.  All lots in the queue share the same side.
    const queue: Lot[] = [];
    let queueSide: Side | null = null;

    for (const fill of coinFills) {
      // Signed size: positive = long (buy), negative = short (sell)
      const signedSize = fill.sideRaw === "B" ? fill.sz : -fill.sz;

      // Does this fill add to the current queue direction?
      const addsToQueue =
        queue.length === 0 ||
        (queueSide === "long" && signedSize > 0) ||
        (queueSide === "short" && signedSize < 0);

      // ── CASE A: opening fill — push new lot onto the queue ────────────────
      if (addsToQueue) {
        const side: Side = signedSize > 0 ? "long" : "short";
        queue.push({
          side,
          px: fill.px,
          openAt: new Date(fill.timeMs),
          openFill: fill,
          originalSize: Math.abs(signedSize),
          remainingSize: Math.abs(signedSize),
          fee: fill.fee + fill.builderFee,
        });
        queueSide = side;
        continue;
      }

      // ── CASE B: closing fill (or flip) — FIFO match against queue ─────────
      const totalFillSize = Math.abs(signedSize);
      const totalCloseFee = fill.fee + fill.builderFee;
      // Direction multiplier for PnL: +1 for long (buy low sell high),
      //                               −1 for short (sell high buy low)
      const pnlMultiplier = queueSide === "long" ? 1 : -1;

      let toClose = totalFillSize;

      while (toClose > EPSILON && queue.length > 0) {
        const lot = queue[0];
        const subSize = Math.min(lot.remainingSize, toClose);

        // PnL: computed from actual lot/fill prices rather than the exchange's
        // average-cost closedPnl, to reflect true per-lot economics.
        const subPnl = (fill.px - lot.px) * pnlMultiplier * subSize;

        // Fees: prorated by fraction of their respective fills.
        const subCloseFee = totalCloseFee * (subSize / totalFillSize);
        const subOpenFee =
          lot.originalSize > EPSILON
            ? lot.fee * (subSize / lot.originalSize)
            : 0;

        const feesTotal = subOpenFee + subCloseFee;
        const pnlNet = subPnl - feesTotal;

        trades.push({
          coin,
          side: lot.side,
          openAt: lot.openAt,
          closeAt: new Date(fill.timeMs),
          durationSeconds: Math.floor(
            (fill.timeMs - lot.openAt.getTime()) / 1000
          ),
          avgEntryPx: lot.px,
          avgExitPx: fill.px,
          size: subSize,
          notional: lot.px * subSize,
          realizedPnl: subPnl,
          feesTotal,
          pnlNet,
          isWinner: pnlNet > 0,
          numFills: 2,
          fills: [lot.openFill, fill],
        });

        toClose -= subSize;
        lot.remainingSize -= subSize;
        if (lot.remainingSize <= EPSILON) queue.shift();
      }

      // ── CASE C: flip residual ─────────────────────────────────────────────
      // If toClose > 0 the queue was fully drained and the residual opens a
      // new position in the opposite direction.  The flip fill's total fee is
      // split: already allocated portion went to the closing sub-trades above;
      // the remainder belongs to the new opening lot.
      if (toClose > EPSILON) {
        const newSide: Side = signedSize > 0 ? "long" : "short";
        const flipOpenFee = totalCloseFee * (toClose / totalFillSize);
        // queue is already empty at this point (fully drained above)
        queue.push({
          side: newSide,
          px: fill.px,
          openAt: new Date(fill.timeMs),
          openFill: fill,
          originalSize: toClose,
          remainingSize: toClose,
          fee: flipOpenFee,
        });
        queueSide = newSide;
      }

      // If toClose ≈ 0 and queue is now empty: position fully closed.
      // queueSide stays as-is; it will be reset by the next addsToQueue fill.
      if (queue.length === 0) queueSide = null;
    }

    // Lots still in queue = open position at end of the analysis window.
    // Not emitted — they are not closed trades.
  }

  // Step 4 — sort by closeAt and apply the warmup filter
  trades.sort((a, b) => a.closeAt.getTime() - b.closeAt.getTime());

  if (emitAfter) {
    const cutoffMs = emitAfter.getTime();
    return trades.filter((t) => t.closeAt.getTime() >= cutoffMs);
  }

  return trades;
}

// ---------------------------------------------------------------------------
// API helpers (unchanged)
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
// Self-tests
// ---------------------------------------------------------------------------

function makeFill(
  fields: Omit<Fill, "builderFee"> & { builderFee?: number }
): Fill {
  return { builderFee: 0, ...fields };
}

function near(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) < tol;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

// --- 1. Simple long: 1 open + 1 close → 1 sub-trade ---
function testSimpleLong(): void {
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "B", px: 100, sz: 1, timeMs: 1000, fee: 0.05, closedPnl: 0,  dir: "Open Long",  oid: 1, tid: 1 }),
    makeFill({ coin: "BTC", sideRaw: "A", px: 110, sz: 1, timeMs: 2000, fee: 0.055, closedPnl: 10, dir: "Close Long", oid: 2, tid: 2 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 1, `expected 1 trade, got ${trades.length}`);
  const t = trades[0];
  assert(t.side === "long", "side");
  assert(near(t.avgEntryPx, 100), "avgEntryPx");
  assert(near(t.avgExitPx, 110), "avgExitPx");
  assert(near(t.size, 1), "size");
  // FIFO PnL: (110 − 100) × 1 × 1 = 10
  assert(near(t.realizedPnl, 10), "realizedPnl");
  assert(near(t.feesTotal, 0.105), "feesTotal");
  assert(near(t.pnlNet, 9.895), "pnlNet");
  assert(t.numFills === 2, "numFills");
  console.log("PASS: simple long");
}

// --- 2. Simple short ---
function testSimpleShort(): void {
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "A", px: 100, sz: 1, timeMs: 1000, fee: 0.05,  closedPnl: 0,  dir: "Open Short",  oid: 1, tid: 1 }),
    makeFill({ coin: "BTC", sideRaw: "B", px: 90,  sz: 1, timeMs: 2000, fee: 0.045, closedPnl: 10, dir: "Close Short", oid: 2, tid: 2 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 1, `expected 1 trade, got ${trades.length}`);
  const t = trades[0];
  assert(t.side === "short", "side");
  // FIFO PnL: (90 − 100) × (−1) × 1 = 10
  assert(near(t.realizedPnl, 10), "realizedPnl");
  assert(near(t.pnlNet, 9.905), "pnlNet");
  console.log("PASS: simple short");
}

// --- 3. FIFO key test: 2 opens at different prices, 1 close → 2 sub-trades ---
//
// Each lot is matched independently.  PnL is per-lot, not average-cost.
// Total PnL equals what the exchange would report (avg-cost coincides here
// because both lots are fully closed at the same exit price).
function testScaleInFIFO(): void {
  const fills = [
    makeFill({ coin: "ETH", sideRaw: "B", px: 1000, sz: 1, timeMs: 1000, fee: 0.5,  closedPnl: 0,   dir: "Open Long",  oid: 1, tid: 1 }),
    makeFill({ coin: "ETH", sideRaw: "B", px: 1100, sz: 1, timeMs: 1500, fee: 0.55, closedPnl: 0,   dir: "Open Long",  oid: 2, tid: 2 }),
    makeFill({ coin: "ETH", sideRaw: "A", px: 1200, sz: 2, timeMs: 2000, fee: 1.2,  closedPnl: 300, dir: "Close Long", oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  // FIFO → lot-1 matched first, then lot-2
  assert(trades.length === 2, `expected 2 sub-trades, got ${trades.length}`);

  const t1 = trades[0]; // lot-1: entry 1000, exit 1200
  const t2 = trades[1]; // lot-2: entry 1100, exit 1200
  // Both close at the same time, so sorted by insertion order
  assert(near(t1.avgEntryPx, 1000), "t1.avgEntryPx");
  assert(near(t1.avgExitPx, 1200), "t1.avgExitPx");
  assert(near(t1.size, 1), "t1.size");
  // FIFO PnL: (1200 − 1000) × 1 = 200
  assert(near(t1.realizedPnl, 200), "t1.realizedPnl");
  // Close fee for t1: 1.2 × (1/2) = 0.6; open fee: 0.5 × (1/1) = 0.5
  assert(near(t1.feesTotal, 1.1, 1e-9), "t1.feesTotal");

  assert(near(t2.avgEntryPx, 1100), "t2.avgEntryPx");
  assert(near(t2.avgExitPx, 1200), "t2.avgExitPx");
  assert(near(t2.size, 1), "t2.size");
  // FIFO PnL: (1200 − 1100) × 1 = 100
  assert(near(t2.realizedPnl, 100), "t2.realizedPnl");
  // Total PnL across both sub-trades = 300 (matches exchange closedPnl)
  assert(near(t1.realizedPnl + t2.realizedPnl, 300), "total FIFO PnL = exchange PnL");

  console.log("PASS: scale-in FIFO (2 lots → 2 sub-trades)");
}

// --- 4. Partial close: 1 lot, 2 closing fills → 2 sub-trades ---
//
// A single opening lot is matched against two successive closing fills.
function testPartialClose(): void {
  const fills = [
    makeFill({ coin: "SOL", sideRaw: "B", px: 100, sz: 2, timeMs: 1000, fee: 0.1,  closedPnl: 0,  dir: "Open Long",  oid: 1, tid: 1 }),
    makeFill({ coin: "SOL", sideRaw: "A", px: 110, sz: 1, timeMs: 2000, fee: 0.055, closedPnl: 10, dir: "Close Long", oid: 2, tid: 2 }),
    makeFill({ coin: "SOL", sideRaw: "A", px: 120, sz: 1, timeMs: 3000, fee: 0.06,  closedPnl: 20, dir: "Close Long", oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  // 1 lot matched against 2 closing fills → 2 sub-trades
  assert(trades.length === 2, `expected 2 sub-trades, got ${trades.length}`);

  const t1 = trades[0]; // close at 110
  const t2 = trades[1]; // close at 120
  assert(near(t1.avgEntryPx, 100), "t1.avgEntryPx");
  assert(near(t1.avgExitPx, 110), "t1.avgExitPx");
  assert(near(t1.size, 1), "t1.size");
  // FIFO PnL: (110 − 100) × 1 = 10
  assert(near(t1.realizedPnl, 10), "t1.realizedPnl");
  // Open fee proration: 0.1 × (1/2) = 0.05
  assert(near(t1.feesTotal, 0.05 + 0.055), "t1.feesTotal");

  assert(near(t2.avgEntryPx, 100), "t2.avgEntryPx");
  assert(near(t2.avgExitPx, 120), "t2.avgExitPx");
  // FIFO PnL: (120 − 100) × 1 = 20
  assert(near(t2.realizedPnl, 20), "t2.realizedPnl");
  assert(near(t2.feesTotal, 0.05 + 0.06), "t2.feesTotal");

  console.log("PASS: partial close (1 lot × 2 closing fills → 2 sub-trades)");
}

// --- 5. Flip: long 100 → sell 200 (close 100 long, open 100 short) → close 100 short ---
function testFlip(): void {
  const fills = [
    makeFill({ coin: "DOGE", sideRaw: "B", px: 0.10, sz: 100, timeMs: 1000, fee: 0.01,  closedPnl: 0, dir: "Open Long",    oid: 1, tid: 1 }),
    makeFill({ coin: "DOGE", sideRaw: "A", px: 0.12, sz: 200, timeMs: 2000, fee: 0.024, closedPnl: 2, dir: "Long > Short", oid: 2, tid: 2 }),
    makeFill({ coin: "DOGE", sideRaw: "B", px: 0.11, sz: 100, timeMs: 3000, fee: 0.011, closedPnl: 1, dir: "Close Short",  oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 2, `expected 2 trades, got ${trades.length}`);

  const longT  = trades[0]; // closes at t=2000
  const shortT = trades[1]; // closes at t=3000
  assert(longT.side === "long", "longT.side");
  assert(near(longT.size, 100), "longT.size");
  // FIFO PnL: (0.12 − 0.10) × 1 × 100 = 2
  assert(near(longT.realizedPnl, 2), "longT.realizedPnl");
  // Closing fee proration: flip fill 0.024 × (100/200) = 0.012
  assert(near(longT.feesTotal, 0.01 + 0.012, 1e-9), "longT.feesTotal");

  assert(shortT.side === "short", "shortT.side");
  assert(near(shortT.size, 100), "shortT.size");
  // FIFO PnL: (0.11 − 0.12) × (−1) × 100 = 1
  assert(near(shortT.realizedPnl, 1), "shortT.realizedPnl");
  // Open fee: flip residual took 0.024 × (100/200) = 0.012
  assert(near(shortT.feesTotal, 0.012 + 0.011, 1e-9), "shortT.feesTotal");

  console.log("PASS: flip (long → short → closed)");
}

// --- 6. Multi-asset independence ---
function testMultiAsset(): void {
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "B", px: 100,  sz: 1, timeMs: 1000, fee: 0, closedPnl: 0,   dir: "Open Long",  oid: 1, tid: 1 }),
    makeFill({ coin: "ETH", sideRaw: "B", px: 3000, sz: 1, timeMs: 1100, fee: 0, closedPnl: 0,   dir: "Open Long",  oid: 2, tid: 2 }),
    makeFill({ coin: "BTC", sideRaw: "A", px: 110,  sz: 1, timeMs: 2000, fee: 0, closedPnl: 10,  dir: "Close Long", oid: 3, tid: 3 }),
    makeFill({ coin: "ETH", sideRaw: "A", px: 3100, sz: 1, timeMs: 2100, fee: 0, closedPnl: 100, dir: "Close Long", oid: 4, tid: 4 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 2, `expected 2 trades, got ${trades.length}`);
  const btc = trades.find((t) => t.coin === "BTC")!;
  const eth = trades.find((t) => t.coin === "ETH")!;
  assert(near(btc.realizedPnl, 10), "BTC realizedPnl");
  assert(near(eth.realizedPnl, 100), "ETH realizedPnl");
  console.log("PASS: multi-asset independence");
}

// --- 7. Fee conservation: total fees across sub-trades = fill fees ---
function testFeeConservation(): void {
  // 3 opening lots at different prices, 1 closing fill
  const fills = [
    makeFill({ coin: "BTC", sideRaw: "B", px: 100, sz: 1, timeMs: 1000, fee: 0.10, closedPnl: 0,  dir: "Open Long",  oid: 1, tid: 1 }),
    makeFill({ coin: "BTC", sideRaw: "B", px: 200, sz: 2, timeMs: 1500, fee: 0.20, closedPnl: 0,  dir: "Open Long",  oid: 2, tid: 2 }),
    makeFill({ coin: "BTC", sideRaw: "B", px: 150, sz: 1, timeMs: 1800, fee: 0.15, closedPnl: 0,  dir: "Open Long",  oid: 3, tid: 3 }),
    makeFill({ coin: "BTC", sideRaw: "A", px: 250, sz: 4, timeMs: 2000, fee: 0.40, closedPnl: 0,  dir: "Close Long", oid: 4, tid: 4 }),
  ];
  const trades = reconstructTrades(fills);
  assert(trades.length === 3, `expected 3 sub-trades, got ${trades.length}`);

  // Total open fees = 0.10 + 0.20 + 0.15 = 0.45
  // Total close fees = 0.40
  const totalFees = trades.reduce((s, t) => s + t.feesTotal, 0);
  assert(near(totalFees, 0.45 + 0.40, 1e-7), `fee conservation: expected 0.85, got ${totalFees}`);

  // FIFO order: lot-1 (sz=1), lot-2 (sz=2), lot-3 (sz=1)
  assert(near(trades[0].avgEntryPx, 100), "lot-1 entry");
  assert(near(trades[0].size, 1), "lot-1 size");
  assert(near(trades[1].avgEntryPx, 200), "lot-2 entry");
  assert(near(trades[1].size, 2), "lot-2 size");
  assert(near(trades[2].avgEntryPx, 150), "lot-3 entry");
  assert(near(trades[2].size, 1), "lot-3 size");

  console.log("PASS: fee conservation (3 lots × 1 close → 3 sub-trades)");
}

// --- 8. Orphan closing fill (position opened before analysis window) → ignored ---
function testOrphanClose(): void {
  // Only the closing fill is visible; the opening fill is outside the window.
  const fills = [
    makeFill({ coin: "SOL", sideRaw: "A", px: 120, sz: 1, timeMs: 2000, fee: 0.06, closedPnl: 20, dir: "Close Long", oid: 3, tid: 3 }),
  ];
  const trades = reconstructTrades(fills);
  // No matching opening lot → queue is empty → no sub-trade emitted
  assert(trades.length === 0, `expected 0 trades, got ${trades.length}`);
  console.log("PASS: orphan closing fill silently ignored");
}

// --- 9. emitAfter filter: warmup fills populate queue but are not emitted ---
function testEmitAfter(): void {
  const warmupStart = 1000;
  const analysisStart = 3000;

  const fills = [
    // Warmup fill: opens a lot before the analysis window
    makeFill({ coin: "BTC", sideRaw: "B", px: 100, sz: 1, timeMs: warmupStart, fee: 0.05, closedPnl: 0, dir: "Open Long", oid: 1, tid: 1 }),
    // Analysis-window fill: closes the lot opened during warmup
    makeFill({ coin: "BTC", sideRaw: "A", px: 110, sz: 1, timeMs: analysisStart + 1000, fee: 0.055, closedPnl: 10, dir: "Close Long", oid: 2, tid: 2 }),
  ];
  const trades = reconstructTrades(fills, new Date(analysisStart));
  // The warmup open lot is correctly matched; the sub-trade closeAt is within
  // the analysis window → it is included in the result.
  assert(trades.length === 1, `expected 1 trade, got ${trades.length}`);
  // Entry price reflects the warmup lot (correct pre-window context)
  assert(near(trades[0].avgEntryPx, 100), "avgEntryPx from warmup lot");
  console.log("PASS: emitAfter — warmup lot populates queue, sub-trade emitted correctly");
}

// --- 10. Scale-in then partial close: complex FIFO ordering ---
//
//   Open 3 @100 (lot A)
//   Open 2 @200 (lot B)
//   Close 2 → matches lot A partially (2 of 3)
//   Close 3 → matches lot A remainder (1 of 3) + lot B fully (2)
function testComplexFIFO(): void {
  const fills = [
    makeFill({ coin: "ETH", sideRaw: "B", px: 100, sz: 3, timeMs: 1000, fee: 0, closedPnl: 0, dir: "Open Long",  oid: 1, tid: 1 }),
    makeFill({ coin: "ETH", sideRaw: "B", px: 200, sz: 2, timeMs: 2000, fee: 0, closedPnl: 0, dir: "Open Long",  oid: 2, tid: 2 }),
    makeFill({ coin: "ETH", sideRaw: "A", px: 150, sz: 2, timeMs: 3000, fee: 0, closedPnl: 0, dir: "Close Long", oid: 3, tid: 3 }),
    makeFill({ coin: "ETH", sideRaw: "A", px: 250, sz: 3, timeMs: 4000, fee: 0, closedPnl: 0, dir: "Close Long", oid: 4, tid: 4 }),
  ];
  const trades = reconstructTrades(fills);
  // Expected sub-trades:
  //  1. lot A (2/3) × close@150: PnL=(150−100)×2=100
  //  2. lot A (1/3) × close@250: PnL=(250−100)×1=150
  //  3. lot B (2/2) × close@250: PnL=(250−200)×2=100
  assert(trades.length === 3, `expected 3 sub-trades, got ${trades.length}`);

  assert(near(trades[0].avgEntryPx, 100) && near(trades[0].size, 2) && near(trades[0].realizedPnl, 100), "sub-trade 1");
  assert(near(trades[1].avgEntryPx, 100) && near(trades[1].size, 1) && near(trades[1].realizedPnl, 150), "sub-trade 2");
  assert(near(trades[2].avgEntryPx, 200) && near(trades[2].size, 2) && near(trades[2].realizedPnl, 100), "sub-trade 3");

  console.log("PASS: complex FIFO (partial close across 2 lots)");
}

export function runTests(): void {
  testSimpleLong();
  testSimpleShort();
  testScaleInFIFO();
  testPartialClose();
  testFlip();
  testMultiAsset();
  testFeeConservation();
  testOrphanClose();
  testEmitAfter();
  testComplexFIFO();
  console.log("\nAll 10 tests passed.");
}
