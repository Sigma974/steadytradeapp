// Sentinel used when a value is null, undefined, NaN, or non-finite (e.g. Infinity
// serialized to null by JSON.stringify).  Displaying "—" is always safe.
const DASH = "—";

export function fmtPnl(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return DASH;
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (n >= 0 ? "+" : "-") + "$" + abs;
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return DASH;
  return "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Compact signed USD for card/row display. Use fmtPnl for exact tooltip values.
// Examples: +$1.25K  -$20.82K  +$11.50M  -$1.25B
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return DASH;
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

// Compact unsigned USD for sizes, fees, drawdown amounts.
// Examples: $1.25K  $11.50M  $1.25B
export function fmtCompactUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return DASH;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)         return `$${(abs / 1_000).toFixed(2)}K`;
  return `$${abs.toFixed(2)}`;
}

// Compact integer for trade/fill counts. No abbreviation below 10 000.
// Examples: 30  9 999  13.6K  1.5M
export function fmtCompactNum(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return DASH;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || !isFinite(n)) return DASH;
  return (n * 100).toFixed(decimals) + "%";
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds)) return DASH;
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (seconds < 3600) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null || !isFinite(n)) return DASH;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Safe toFixed — returns "—" for null/undefined/NaN/Infinity (e.g. Infinity serialized
// to null by JSON.stringify, or missing fields from older cache entries).
export function fmtFixed(n: number | null | undefined, decimals = 2, suffix = ""): string {
  if (n == null || !isFinite(n)) return DASH;
  return n.toFixed(decimals) + suffix;
}

// Returns a neutral color for null/undefined/NaN so callers never have to guard.
export function pnlColor(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "text-slate-400";
  return n >= 0 ? "text-emerald-400" : "text-red-400";
}
