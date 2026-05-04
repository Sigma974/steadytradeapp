CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_started
  ON sessions(user_id, started_at DESC);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Ajouter session_id à la table triggers
ALTER TABLE triggers ADD COLUMN session_id UUID
  REFERENCES sessions(id) ON DELETE CASCADE;

CREATE INDEX idx_triggers_session ON triggers(session_id);

-- Note : on ne met PAS NOT NULL sur session_id pour préserver
-- les triggers déjà loggés sans session lors des tests du Bloc 2.
