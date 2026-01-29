/*
  Migration: Add document_type to support Estimates vs Invoices
  --------------------------------------------------------------
  This migration adds:
  - document_type: 'estimate' or 'invoice' to differentiate documents
  - converted_from_id: Links an invoice back to the estimate it came from
  - Updates invoice numbering to support EST- and INV- prefixes
  
  Workflow:
  - Estimates: draft → sent → accepted/declined
  - When accepted: Creates invoice with status 'pending'
  - Invoices: pending → draft → sent → paid/overdue
*/

-- Add document_type column with default 'invoice' for existing records
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('estimate', 'invoice'));

-- Add reference to track which estimate became which invoice
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS converted_from_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add timestamp for when estimate was accepted
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Create index for filtering by document type
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);

-- Create index for finding converted invoices
CREATE INDEX IF NOT EXISTS idx_invoices_converted_from ON invoices(converted_from_id) WHERE converted_from_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN invoices.document_type IS 'Type of document: estimate or invoice';
COMMENT ON COLUMN invoices.converted_from_id IS 'If this invoice was created from an estimate, references that estimate';
COMMENT ON COLUMN invoices.accepted_at IS 'When the client accepted the estimate';



