/*
  Migration: Add Stripe payment fields to invoices
  -------------------------------------------------
  Adds columns to track Stripe payment information.
  
  These fields are populated when a payment is successfully processed:
  - paid_at: Timestamp when payment was received
  - stripe_payment_id: The Stripe PaymentIntent ID
  - stripe_session_id: The Stripe Checkout Session ID
*/

-- Add payment tracking columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Create an index for looking up invoices by payment ID
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_id 
ON invoices(stripe_payment_id) 
WHERE stripe_payment_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN invoices.paid_at IS 
'Timestamp when the invoice was paid via Stripe';

COMMENT ON COLUMN invoices.stripe_payment_id IS 
'Stripe PaymentIntent ID for successful payments';

COMMENT ON COLUMN invoices.stripe_session_id IS 
'Stripe Checkout Session ID used for payment';




