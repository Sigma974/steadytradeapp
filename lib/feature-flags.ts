// ── Period feature gates ───────────────────────────────────────────────────────
// canAccessLongPeriods() is the single source of truth for Pro gating.
// When the Pro tier ships: replace `return true` with a subscription check.

export const FREE_PERIODS = ["30d"] as const;
export const PRO_PERIODS = [
  "7d",
  "30d",
  "90d",
  "6m",
  "1y",
  "all",
  "custom",
] as const;

export function canAccessLongPeriods(): boolean {
  // TODO: return user.subscription_tier === 'pro' when billing ships.
  return true;
}
