-- Selected Plan Fields for Contractor Profiles
-- =============================================
-- Tracks which subscription plan the user selected during registration.
-- During the free demo period, all plans have the same access.
-- These fields help segment users and will be used for billing when demo ends.

-- The plan name (e.g., 'starter', 'growth', 'pro') for display purposes
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS selected_plan TEXT DEFAULT 'starter';

-- The Stripe Price ID associated with the selected plan
-- This is used when converting from demo to paid subscription
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS selected_price_id TEXT;

-- Add comments explaining the fields for future reference
COMMENT ON COLUMN contractor_profiles.selected_plan IS 'The subscription plan name selected during registration (e.g., starter, growth, pro)';
COMMENT ON COLUMN contractor_profiles.selected_price_id IS 'The Stripe Price ID for the selected plan, used for future billing activation';

