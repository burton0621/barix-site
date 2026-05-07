-- 013_add_google_calendar_tokens.sql
-- Stores per-user Google OAuth tokens for Calendar API access.
-- One row per user, upserted on connect or token refresh.

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The Supabase user who connected their Google account
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens from Google
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expiry_date BIGINT,  -- Unix ms timestamp of access_token expiry

  -- Display metadata
  google_email TEXT,

  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_calendar_tokens(user_id);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own Google token" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can insert their own Google token" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can update their own Google token" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can delete their own Google token" ON google_calendar_tokens;

CREATE POLICY "Users can view their own Google token"
  ON google_calendar_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own Google token"
  ON google_calendar_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own Google token"
  ON google_calendar_tokens FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own Google token"
  ON google_calendar_tokens FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP TRIGGER IF EXISTS google_tokens_updated_at ON google_calendar_tokens;
CREATE TRIGGER google_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
