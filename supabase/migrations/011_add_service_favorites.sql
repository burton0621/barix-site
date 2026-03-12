-- Migration: Add favorites and usage tracking to services
-- Allows users to pin favorite services and tracks usage count

-- Add is_favorite flag to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add usage_count to track how often a service is used
ALTER TABLE services ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add last_used_at to track recency
ALTER TABLE services ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Index for sorting by favorites and usage
CREATE INDEX IF NOT EXISTS idx_services_favorite ON services(owner_id, is_favorite DESC);
CREATE INDEX IF NOT EXISTS idx_services_usage ON services(owner_id, usage_count DESC);

-- Function to increment usage count when a service is used in an invoice line item
CREATE OR REPLACE FUNCTION increment_service_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_id IS NOT NULL THEN
    UPDATE services 
    SET 
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment usage when line item is created
DROP TRIGGER IF EXISTS on_line_item_created ON invoice_line_items;
CREATE TRIGGER on_line_item_created
  AFTER INSERT ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION increment_service_usage();

-- Comments for documentation
COMMENT ON COLUMN services.is_favorite IS 'User-pinned favorite service for quick access';
COMMENT ON COLUMN services.usage_count IS 'Number of times this service has been used in invoices';
COMMENT ON COLUMN services.last_used_at IS 'Timestamp of when service was last used in an invoice';
