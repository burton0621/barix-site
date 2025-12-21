/*
  Migration: Add service_id to invoice_line_items
  ------------------------------------------------
  This migration adds a service_id column to the invoice_line_items table
  so that we can track which service was used for each line item.
  
  This allows the invoice edit modal to pre-select the correct service
  in the dropdown when editing an existing invoice.
  
  The column is nullable because:
  1. Existing line items won't have a service_id
  2. Users can create custom line items without selecting a saved service
*/

-- Add the service_id column to invoice_line_items
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Create an index for faster lookups when querying by service
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_service_id 
ON invoice_line_items(service_id);

-- Add a comment explaining the column
COMMENT ON COLUMN invoice_line_items.service_id IS 
'References the service used for this line item. NULL if custom/manual entry.';




