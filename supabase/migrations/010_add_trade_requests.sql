-- Migration: Add table for tracking custom trade/business type requests
-- This helps capture user-requested trades that aren't in our predefined list
-- for future product development and service template expansion

CREATE TABLE IF NOT EXISTS trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trade_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_trade_requests_trade_name ON trade_requests(trade_name);
CREATE INDEX IF NOT EXISTS idx_trade_requests_created_at ON trade_requests(created_at);

-- RLS policies
ALTER TABLE trade_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own trade requests
CREATE POLICY "Users can insert trade requests"
  ON trade_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own trade requests
CREATE POLICY "Users can view own trade requests"
  ON trade_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE trade_requests IS 'Stores custom trade/business type requests from users for future service template development';
