import { supabase } from "./supabase";
import type { SyncData } from "./api-types";
import { SCHEMA_VERSION } from "./api-types";

const CACHE_TTL_MINUTES = 60;
const RATE_LIMIT_MAX = 20;       // requests
const RATE_LIMIT_WINDOW_MIN = 60; // per hour

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

export async function getCachedSync(
  address: string,
  daysBack: number
): Promise<SyncData | null> {
  const cutoff = new Date(
    Date.now() - CACHE_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("syncs")
    .select("response")
    .eq("address", address.toLowerCase())
    .eq("days_back", daysBack)
    .gte("fetched_at", cutoff)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const response = data.response as SyncData;
  if (response.schemaVersion !== SCHEMA_VERSION) return null;
  return response;
}

export async function setCachedSync(
  address: string,
  daysBack: number,
  response: SyncData
): Promise<void> {
  await supabase.from("syncs").insert({
    address: address.toLowerCase(),
    days_back: daysBack,
    response,
    fetched_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
  ).toISOString();

  const { count, error } = await supabase
    .from("rate_limit_log")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", windowStart);

  if (error) {
    // If we can't check, allow the request (fail open — availability > security)
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, RATE_LIMIT_MAX - used);
  return { allowed: used < RATE_LIMIT_MAX, remaining };
}

export async function logRequest(ip: string): Promise<void> {
  await supabase.from("rate_limit_log").insert({
    ip,
    created_at: new Date().toISOString(),
  });
}

// Prune old rate limit rows (call occasionally to keep the table small)
export async function pruneRateLimitLog(): Promise<void> {
  const cutoff = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
  ).toISOString();
  await supabase.from("rate_limit_log").delete().lt("created_at", cutoff);
}
