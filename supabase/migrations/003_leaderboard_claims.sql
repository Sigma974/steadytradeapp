-- ============================================================
-- Steady — Leaderboard claims & submission logs
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Extend leaderboard_wallets with claim columns
-- ────────────────────────────────────────────────────────────
alter table public.leaderboard_wallets
  add column if not exists claimed_at      timestamptz,
  add column if not exists claimed_status  text
    check (claimed_status in ('unverified', 'verified'));

-- ────────────────────────────────────────────────────────────
-- 2. submission_logs  (anti-spam / rate-limit)
--    Stores hashed IPs only — no raw IP stored (GDPR).
--    Can be purged beyond 30 days.
-- ────────────────────────────────────────────────────────────
create table public.submission_logs (
  id                 bigint generated always as identity primary key,
  ip_hash            text        not null,
  submitted_at       timestamptz not null default now(),
  submitted_address  text        not null
);

-- Fast rate-limit lookup: "did this ip_hash submit in the last N minutes?"
create index submission_logs_ip_hash_submitted_at_idx
  on public.submission_logs (ip_hash, submitted_at desc);

alter table public.submission_logs enable row level security;

-- No client access — all writes go through the service-role key (API routes)
