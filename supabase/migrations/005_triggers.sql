CREATE TABLE IF NOT EXISTS triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('clean', 'not_clean')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_triggers_user_created
  ON triggers(user_id, created_at DESC);

-- RLS : un user ne voit que ses propres triggers
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own triggers"
  ON triggers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own triggers"
  ON triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
