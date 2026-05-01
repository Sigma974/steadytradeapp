-- ============================================================
-- Steady — Leaderboard tables migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. leaderboard_wallets
--    Registry of all wallets eligible for the Discipline Index.
--    Sources: "manual" (seeded), "user_synced" (auto-added on
--    user sync), "submitted" (community submission via modal).
-- ────────────────────────────────────────────────────────────
create table public.leaderboard_wallets (
  address         text primary key check (char_length(address) = 42),
  source          text not null default 'manual'
                    check (source in ('manual', 'user_synced', 'submitted')),
  first_added_at  timestamptz not null default now(),
  twitter_handle  text,
  is_excluded     boolean not null default false
);

alter table public.leaderboard_wallets enable row level security;

-- Public read — the leaderboard page needs to read this
create policy "leaderboard_wallets: public read"
  on public.leaderboard_wallets for select
  using (true);

-- No insert/update/delete from the client — all writes go through
-- the service-role key (cron job, seed script, admin operations)


-- ────────────────────────────────────────────────────────────
-- 2. leaderboard_snapshots
--    One row per (wallet, day). The cron job upserts daily.
--    rank is computed after all snapshots for the day are
--    inserted, then updated in a second pass.
-- ────────────────────────────────────────────────────────────
create table public.leaderboard_snapshots (
  id              uuid primary key default gen_random_uuid(),
  wallet_address  text not null references public.leaderboard_wallets(address) on delete cascade,
  snapshot_date   date not null default current_date,
  steady_score    integer not null,
  verdict         text,
  pnl_net         numeric not null,
  win_rate        numeric not null,
  trades_count    integer not null,
  total_notional  numeric not null,
  rank            integer,

  unique (wallet_address, snapshot_date)
);

alter table public.leaderboard_snapshots enable row level security;

-- Public read — the leaderboard page queries the latest snapshot
create policy "leaderboard_snapshots: public read"
  on public.leaderboard_snapshots for select
  using (true);

-- No client writes — service-role key only


-- ────────────────────────────────────────────────────────────
-- 3. Index for the most common query:
--    "latest snapshot for each wallet, ordered by rank"
-- ────────────────────────────────────────────────────────────
create index leaderboard_snapshots_date_rank_idx
  on public.leaderboard_snapshots (snapshot_date desc, rank asc nulls last);
