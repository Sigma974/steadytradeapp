-- Table wallets : un user a un seul wallet pour le MVP
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_address CHECK (address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet"
  ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wallet"
  ON wallets FOR DELETE USING (auth.uid() = user_id);

-- Table trades : trades reconstruits depuis Hyperliquid pour les sessions
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  pnl_usd NUMERIC,
  fees_usd NUMERIC DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_session ON trades(session_id, entry_time);
CREATE INDEX idx_trades_user_entry ON trades(user_id, entry_time DESC);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trades"
  ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE USING (auth.uid() = user_id);

-- Adaptation de la table triggers
ALTER TABLE triggers ADD COLUMN IF NOT EXISTS trigger_type TEXT
  NOT NULL DEFAULT 'session_start'
  CHECK (trigger_type IN ('session_start', 'trade_tag'));

ALTER TABLE triggers ADD COLUMN IF NOT EXISTS trade_id UUID
  REFERENCES trades(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_triggers_type
  ON triggers(session_id, trigger_type);
