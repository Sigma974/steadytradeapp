import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getIpHash, isRateLimited, logSubmission } from "@/lib/leaderboard-rate-limit";
import { snapshotSingleWallet } from "@/lib/leaderboard-snapshot";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/;

export async function POST(req: NextRequest): Promise<Response> {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: { address?: unknown; twitter_handle?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address =
    typeof body.address === "string" ? body.address.trim().toLowerCase() : null;
  const rawHandle =
    typeof body.twitter_handle === "string" ? body.twitter_handle.trim() : null;
  const twitterHandle = rawHandle ? rawHandle.replace(/^@/, "") : null;

  // ── 2. Validate address ────────────────────────────────────────────────────
  if (!address || !ADDRESS_RE.test(address)) {
    return Response.json(
      { error: "invalid_address" },
      { status: 400 }
    );
  }

  // ── 3. Validate twitter_handle if provided ─────────────────────────────────
  if (twitterHandle && !HANDLE_RE.test(twitterHandle)) {
    return Response.json(
      { error: "invalid_handle" },
      { status: 400 }
    );
  }

  // ── 4. Rate limit ──────────────────────────────────────────────────────────
  const ipHash = getIpHash(req);
  if (await isRateLimited(ipHash)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  // ── 5. Already in leaderboard? ─────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("leaderboard_wallets")
    .select("address")
    .eq("address", address)
    .maybeSingle();

  if (existing) {
    if (twitterHandle) {
      return Response.json({ error: "already_exists_use_claim" }, { status: 409 });
    }
    return Response.json({ status: "already_exists" });
  }

  // ── 6. Insert wallet ───────────────────────────────────────────────────────
  const { error: insertErr } = await supabase
    .from("leaderboard_wallets")
    .insert({
      address,
      source: "submitted",
      twitter_handle: twitterHandle ?? null,
    });

  if (insertErr) {
    return Response.json({ error: "db_error" }, { status: 500 });
  }

  // ── 7. Log submission for rate limiting ────────────────────────────────────
  await logSubmission(ipHash, address);

  // ── 8. Immediate snapshot (~5–10s — hits Hyperliquid API) ──────────────────
  const result = await snapshotSingleWallet(address);

  return Response.json({
    status: result.status === "ok" ? "added" : result.status,
    ...(result.status === "ok" && { score: result.score }),
    ...(result.status !== "ok" && { reason: (result as { reason: string }).reason }),
  });
}
