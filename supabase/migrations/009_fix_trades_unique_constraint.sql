-- Fix: include close_at in the UNIQUE constraint on trades.
-- The previous constraint (user_id, coin, open_at, side) breaks when a single
-- lot is closed in multiple fills (partial close / scale-out): all sub-trades
-- share the same open_at from the opening fill but have different close_at.
-- Postgres treats NULL != NULL, so open trades (close_at IS NULL) are not
-- affected by this constraint — acceptable for MVP.

-- Drop the index created in 008
DROP INDEX IF EXISTS idx_trades_unique_round_trip;

-- Drop any named constraint that may exist
ALTER TABLE trades DROP CONSTRAINT IF EXISTS unique_trade;

-- Recreate with close_at included
ALTER TABLE trades
  ADD CONSTRAINT unique_trade
  UNIQUE (user_id, coin, open_at, side, close_at);

-- Recreate the supporting index (implicit with the constraint, but explicit for clarity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_unique_round_trip
  ON trades(user_id, coin, open_at, side, close_at);
