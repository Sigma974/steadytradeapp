-- Aligns live trades table (legacy analytics schema) with the Bloc 5A sync code.
-- Supersedes 008_fix_trades_session_id.sql (never applied).
-- All statements are idempotent.

-- 1. Add missing columns
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS session_id UUID
    REFERENCES sessions(id) ON DELETE CASCADE;

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- 2. Unique index used by UPSERT ON CONFLICT at polling time.
--    A unique index is equivalent to a unique constraint for ON CONFLICT.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_unique_round_trip
  ON trades(user_id, coin, open_at, side);

-- 3. Index for session-scoped queries
CREATE INDEX IF NOT EXISTS idx_trades_session
  ON trades(session_id, open_at);

-- 4. RLS (idempotent: drop then recreate)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own trades"   ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;

CREATE POLICY "Users can read own trades"
  ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE USING (auth.uid() = user_id);
