import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function getIpHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const salt = process.env.IP_HASH_SALT ?? "steady-leaderboard-salt";
  return createHash("sha256").update(salt + ip).digest("hex");
}

/** Returns true if the IP hash has submitted within the rate limit window. */
export async function isRateLimited(ipHash: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("submission_logs")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("submitted_at", windowStart);
  return (count ?? 0) > 0;
}

/** Log a submission/claim attempt for rate limiting. */
export async function logSubmission(
  ipHash: string,
  submittedAddress: string
): Promise<void> {
  await supabase.from("submission_logs").insert({
    ip_hash: ipHash,
    submitted_address: submittedAddress,
  });
}
