-- Fix FK constraints: redirect user_id references from public.users → auth.users
-- Root cause: legacy analytics schema used public.users which is never populated.

-- trades
ALTER TABLE trades
  DROP CONSTRAINT IF EXISTS trades_user_id_fkey;
ALTER TABLE trades
  ADD CONSTRAINT trades_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- sessions
ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- triggers
ALTER TABLE triggers
  DROP CONSTRAINT IF EXISTS triggers_user_id_fkey;
ALTER TABLE triggers
  ADD CONSTRAINT triggers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- wallets
ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
ALTER TABLE wallets
  ADD CONSTRAINT wallets_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
