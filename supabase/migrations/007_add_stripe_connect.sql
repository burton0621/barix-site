-- Stripe Connect Integration
-- ===========================
-- Adds fields to contractor_profiles for storing Stripe Connect account information.
-- This enables contractors to receive payments directly to their bank accounts
-- through Stripe Connect Express.

-- Add stripe_account_id to store the connected account identifier from Stripe
-- This is the 'acct_xxx' ID that Stripe assigns when a contractor completes onboarding
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Track whether the contractor has completed Stripe onboarding and can receive payouts
-- This gets set to true when Stripe confirms the account is fully verified
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Track whether the account can accept charges (sometimes different from payouts)
-- Both this and payouts_enabled need to be true for full functionality
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;

-- Store any pending requirements from Stripe (like additional verification documents)
-- This is a JSONB field that stores the requirements object from Stripe's API
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_requirements JSONB;

-- Store when the Stripe account was connected, useful for support and debugging
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMP WITH TIME ZONE;

-- Create an index on stripe_account_id for faster lookups when processing webhooks
CREATE INDEX IF NOT EXISTS idx_contractor_stripe_account 
ON contractor_profiles(stripe_account_id) 
WHERE stripe_account_id IS NOT NULL;

