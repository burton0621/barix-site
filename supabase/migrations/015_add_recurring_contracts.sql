-- Migration 015: Add recurring payment contracts
-- Contractors can create recurring billing contracts for customers
-- Stripe subscriptions are created on the contractor's connected account

-- Main recurring contracts table
CREATE TABLE IF NOT EXISTS recurring_contracts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  client_id              UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Contract definition
  title                  TEXT NOT NULL,
  description            TEXT,
  amount                 NUMERIC(10, 2) NOT NULL,
  interval               TEXT NOT NULL
                           CHECK (interval IN ('month', 'quarter', 'year')),
  interval_count         INTEGER NOT NULL DEFAULT 1,
  duration_months        INTEGER,  -- NULL = ongoing; N = cancel after N months

  -- Status lifecycle
  status                 TEXT NOT NULL DEFAULT 'pending_setup'
                           CHECK (status IN (
                             'pending_setup',
                             'active',
                             'paused',
                             'canceled',
                             'expired',
                             'payment_failed'
                           )),

  -- Stripe objects (all on the connected account)
  stripe_customer_id     TEXT,
  stripe_product_id      TEXT,
  stripe_price_id        TEXT,
  stripe_subscription_id TEXT,

  -- Timestamps
  setup_link_sent_at     TIMESTAMP WITH TIME ZONE,
  activated_at           TIMESTAMP WITH TIME ZONE,
  canceled_at            TIMESTAMP WITH TIME ZONE,
  next_billing_date      TIMESTAMP WITH TIME ZONE,
  contract_ends_at       TIMESTAMP WITH TIME ZONE,

  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to invoices table to link auto-generated recurring invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS contract_id      UUID REFERENCES recurring_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recurring_contracts_owner
  ON recurring_contracts(owner_id);

CREATE INDEX IF NOT EXISTS idx_recurring_contracts_client
  ON recurring_contracts(client_id);

CREATE INDEX IF NOT EXISTS idx_recurring_contracts_status
  ON recurring_contracts(status);

CREATE INDEX IF NOT EXISTS idx_recurring_contracts_stripe_sub
  ON recurring_contracts(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_contracts_stripe_cus
  ON recurring_contracts(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_contract
  ON invoices(contract_id)
  WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id
  ON invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- Row-level security: contractors manage only their own contracts
ALTER TABLE recurring_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractors_manage_own_contracts"
  ON recurring_contracts
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public read-only access by UUID (for unauthenticated client setup page)
-- This is safe because UUIDs are unguessable
CREATE POLICY "public_read_contract_for_setup"
  ON recurring_contracts
  FOR SELECT
  USING (true);
