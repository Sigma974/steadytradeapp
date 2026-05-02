import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getIpHash, isRateLimited, logSubmission } from "@/lib/leaderboard-rate-limit";

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
    return Response.json({ error: "invalid_address" }, { status: 400 });
  }

  // ── 3. Validate handle (required) ─────────────────────────────────────────
  if (!twitterHandle) {
    return Response.json({ error: "handle_required" }, { status: 400 });
  }
  if (!HANDLE_RE.test(twitterHandle)) {
    return Response.json({ error: "invalid_handle" }, { status: 400 });
  }

  // ── 4. Rate limit ──────────────────────────────────────────────────────────
  const ipHash = getIpHash(req);
  if (await isRateLimited(ipHash)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  // ── 5. Address must exist in leaderboard ──────────────────────────────────
  const { data: wallet } = await supabase
    .from("leaderboard_wallets")
    .select("address, twitter_handle, claimed_at")
    .eq("address", address)
    .maybeSingle();

  if (!wallet) {
    return Response.json({ error: "address_not_found" }, { status: 404 });
  }

  // ── 6. Not already claimed ─────────────────────────────────────────────────
  if (wallet.claimed_at) {
    return Response.json({ error: "already_claimed" }, { status: 409 });
  }

  // ── 7. Handle not already used by another address ─────────────────────────
  const { data: handleConflict } = await supabase
    .from("leaderboard_wallets")
    .select("address")
    .eq("twitter_handle", twitterHandle)
    .neq("address", address)
    .maybeSingle();

  if (handleConflict) {
    return Response.json({ error: "handle_already_used" }, { status: 409 });
  }

  // ── 8. Log for rate limiting ───────────────────────────────────────────────
  await logSubmission(ipHash, address);

  // ── 9. Update wallet ───────────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("leaderboard_wallets")
    .update({
      twitter_handle: twitterHandle,
      claimed_at: new Date().toISOString(),
      claimed_status: "unverified",
    })
    .eq("address", address);

  if (updateErr) {
    return Response.json({ error: "db_error" }, { status: 500 });
  }

  return Response.json({ status: "claimed" });
}
