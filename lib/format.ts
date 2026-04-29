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

// Returns a neutral color for null/undefined/NaN so callers never have to guard.
export function pnlColor(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "text-slate-400";
  return n >= 0 ? "text-emerald-400" : "text-red-400";
}
