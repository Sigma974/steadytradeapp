import { Trade } from "../trade-reconstruction";

// getUTCDay() → 0=Sun, 1=Mon, …, 6=Sat
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
// Display order: Mon → Sun
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface DaySlot {
  day: number;      // 0=Sun … 6=Sat (UTC)
  dayName: string;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface WeekdayInsight {
  byDay: DaySlot[];           // 7 slots (count may be 0)
  bestDay: DaySlot | null;
  worstDay: DaySlot | null;
  weekendPctTrades: number;   // 0–1
  weekendTotalPnl: number;
  totalPnl: number;
}

export function computeWeekdayPerformance(trades: Trade[]): WeekdayInsight {
  const slots: DaySlot[] = Array.from({ length: 7 }, (_, day) => ({
    day,
    dayName: DAY_NAMES[day],
    count: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
  }));

  const buckets: Trade[][] = Array.from({ length: 7 }, () => []);

  for (const t of trades) {
    const day = t.openAt.getUTCDay();
    buckets[day].push(t);
  }

  for (let d = 0; d < 7; d++) {
    const bucket = buckets[d];
    if (bucket.length === 0) continue;
    const winners = bucket.filter((t) => t.isWinner).length;
    const totalPnl = bucket.reduce((s, t) => s + t.pnlNet, 0);
    slots[d] = {
      day: d,
      dayName: DAY_NAMES[d],
      count: bucket.length,
      winRate: winners / bucket.length,
      totalPnl,
      avgPnl: totalPnl / bucket.length,
    };
  }

  const active = slots.filter((s) => s.count > 0);
  const bestDay = active.length
    ? active.reduce((b, s) => (s.totalPnl > b.totalPnl ? s : b))
    : null;
  const worstDay = active.length
    ? active.reduce((b, s) => (s.totalPnl < b.totalPnl ? s : b))
    : null;

  // Weekend = Saturday (6) + Sunday (0)
  const weekendCount = slots[0].count + slots[6].count;
  const weekendTotalPnl = slots[0].totalPnl + slots[6].totalPnl;
  const totalTrades = trades.length;
  const totalPnl = trades.reduce((s, t) => s + t.pnlNet, 0);

  return {
    byDay: slots,
    bestDay,
    worstDay,
    weekendPctTrades: totalTrades > 0 ? weekendCount / totalTrades : 0,
    weekendTotalPnl,
    totalPnl,
  };
}

// ---------------------------------------------------------------------------
// Self-tests
// ---------------------------------------------------------------------------

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function near(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) < tol;
}

function mkOnDay(utcDay: number, pnlNet: number): Trade {
  // Find a Monday=2025-01-06, Tuesday=2025-01-07, … Sun=2025-01-05
  // Use known UTC dates: 2025-01-06 is a Monday (day=1)
  const monMs = new Date("2025-01-06T12:00:00Z").getTime();
  const offsetMs = ((utcDay - 1 + 7) % 7) * 86_400_000;
  const openMs = monMs + offsetMs;
  return {
    coin: "BTC",
    side: "long",
    openAt: new Date(openMs),
    closeAt: new Date(openMs + 3600_000),
    durationSeconds: 3600,
    avgEntryPx: 100,
    avgExitPx: 100 + pnlNet,
    size: 1,
    notional: 100,
    realizedPnl: pnlNet,
    feesTotal: 0,
    pnlNet,
    isWinner: pnlNet > 0,
    numFills: 1,
    fills: [],
  };
}

function testBasicGrouping(): void {
  const trades = [
    mkOnDay(1, 10),  // Monday
    mkOnDay(1, -5),  // Monday
    mkOnDay(2, 20),  // Tuesday
    mkOnDay(0, -8),  // Sunday (weekend)
    mkOnDay(6, 15),  // Saturday (weekend)
  ];
  const r = computeWeekdayPerformance(trades);

  const mon = r.byDay[1];
  assert(mon.count === 2, `mon count=${mon.count}`);
  assert(near(mon.totalPnl, 5), `mon totalPnl=${mon.totalPnl}`);
  assert(near(mon.winRate, 0.5), `mon winRate=${mon.winRate}`);
  assert(near(mon.avgPnl, 2.5), `mon avgPnl=${mon.avgPnl}`);

  const tue = r.byDay[2];
  assert(tue.count === 1, `tue count=${tue.count}`);
  assert(near(tue.totalPnl, 20), `tue totalPnl=${tue.totalPnl}`);

  // Weekend
  assert(near(r.weekendPctTrades, 2 / 5), `weekendPct=${r.weekendPctTrades}`);
  assert(near(r.weekendTotalPnl, 7), `weekendPnl=${r.weekendTotalPnl}`); // -8+15

  console.log("PASS: basic day grouping");
}

function testBestWorstDay(): void {
  const trades = [
    mkOnDay(1, 100),  // Monday: best
    mkOnDay(3, -50),  // Wednesday: worst
    mkOnDay(5, 20),   // Friday: mid
  ];
  const r = computeWeekdayPerformance(trades);
  assert(r.bestDay?.day === 1, `bestDay=${r.bestDay?.day}`);
  assert(r.worstDay?.day === 3, `worstDay=${r.worstDay?.day}`);
  console.log("PASS: best/worst day");
}

function testEmptyDaysHaveZeroCount(): void {
  const trades = [mkOnDay(1, 10)]; // Only Monday
  const r = computeWeekdayPerformance(trades);
  assert(r.byDay.length === 7, "always 7 slots");
  const emptySun = r.byDay[0];
  assert(emptySun.count === 0, "Sunday has 0 count");
  assert(near(emptySun.totalPnl, 0), "Sunday has 0 pnl");
  console.log("PASS: empty days have zero count");
}

export function runWeekdayTests(): void {
  testBasicGrouping();
  testBestWorstDay();
  testEmptyDaysHaveZeroCount();
  console.log("\nAll weekday tests passed.");
}
