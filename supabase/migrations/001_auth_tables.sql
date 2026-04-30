-- ============================================================
-- Steady — Auth tables migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. user_profiles
-- ────────────────────────────────────────────────────────────
create table public.user_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text check (char_length(username) <= 30),
  profile_type          text check (profile_type in ('scalper', 'intraday', 'swing', 'position', 'mixed')),
  locale                text not null default 'en' check (locale in ('en', 'fr')),
  subscription_tier     text not null default 'free' check (subscription_tier in ('free', 'pro')),
  subscription_started_at timestamptz,
  subscription_ends_at  timestamptz,
  onboarded_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles: select own"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "user_profiles: insert own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "user_profiles: update own"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-update updated_at on every row change
create or replace function public.handle_updated_at()
returns trigger language plpgsql security definer as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_user_profiles_updated
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a blank profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 2. user_wallets
-- ────────────────────────────────────────────────────────────
create table public.user_wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  address    text not null check (char_length(address) = 42),
  label      text not null default 'Main wallet' check (char_length(label) <= 50),
  is_primary boolean not null default false,
  added_at   timestamptz not null default now(),
  unique (user_id, address)
);

alter table public.user_wallets enable row level security;

create policy "user_wallets: select own"
  on public.user_wallets for select
  using (auth.uid() = user_id);

create policy "user_wallets: insert own"
  on public.user_wallets for insert
  with check (auth.uid() = user_id);

create policy "user_wallets: update own"
  on public.user_wallets for update
  using (auth.uid() = user_id);

create policy "user_wallets: delete own"
  on public.user_wallets for delete
  using (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 3. saved_analyses
-- ────────────────────────────────────────────────────────────
create table public.saved_analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  wallet_id  uuid not null references public.user_wallets(id) on delete cascade,
  period     text not null check (period in ('7d', '30d', '90d', '180d', '1y', 'all', 'custom')),
  start_date timestamptz,
  end_date   timestamptz,
  nickname   text check (char_length(nickname) <= 100),
  saved_at   timestamptz not null default now()
);

alter table public.saved_analyses enable row level security;

create policy "saved_analyses: select own"
  on public.saved_analyses for select
  using (auth.uid() = user_id);

create policy "saved_analyses: insert own"
  on public.saved_analyses for insert
  with check (auth.uid() = user_id);

create policy "saved_analyses: update own"
  on public.saved_analyses for update
  using (auth.uid() = user_id);

create policy "saved_analyses: delete own"
  on public.saved_analyses for delete
  using (auth.uid() = user_id);
