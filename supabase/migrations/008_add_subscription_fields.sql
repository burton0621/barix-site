-- Subscription Fields for Contractor Profiles
-- =============================================
-- Tracks subscription status for Barix Billing platform access.
-- Contractors pay $20/month with a 7-day free trial.

-- Stripe customer ID - needed to manage subscriptions and billing
-- This is created when they first subscribe and links to their Stripe customer record
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Current subscription ID - the active subscription in Stripe
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription status - matches Stripe's subscription statuses
-- Possible values: 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- When the current billing period ends (for showing days remaining, etc.)
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE;

-- When the trial ends (null if not on trial)
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Track when they first subscribed
ALTER TABLE contractor_profiles 
ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMP WITH TIME ZONE;

-- Create index on stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_contractor_stripe_customer 
ON contractor_profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

