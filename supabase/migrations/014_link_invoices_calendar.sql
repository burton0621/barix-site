-- Migration 014: Link invoices to calendar appointments

-- 1. Allow invoice_due as a new appointment type
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_type_check
  CHECK (type IN ('client_meeting', 'job_site_visit', 'general', 'invoice_due'));

-- 2. Add invoice reference on appointments (cascade delete: if invoice deleted, appointment loses link)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

-- 3. Add calendar appointment references on invoices
--    SET NULL on delete: if appointment deleted, invoice just loses the reference
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS due_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS job_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
