-- 012_add_appointments.sql
-- Appointments table for the shared team calendar.
-- Scoped by contractor_id so all team members under the same company share it.

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scoped to the contracting company, not the individual user
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,

  -- The user who created this appointment
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Appointment type
  type TEXT NOT NULL DEFAULT 'general'
    CHECK (type IN ('client_meeting', 'job_site_visit', 'general')),

  title TEXT NOT NULL,
  description TEXT,

  -- For client_meeting type: link to clients table
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- For job_site_visit type: location string
  location TEXT,

  -- Time fields stored in UTC
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,

  -- Google Calendar sync fields
  google_event_id TEXT,
  google_calendar_id TEXT DEFAULT 'primary',
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT appointments_end_after_start CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_contractor_id ON appointments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id ON appointments(google_event_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view their company appointments" ON appointments;
DROP POLICY IF EXISTS "Team members can create appointments" ON appointments;
DROP POLICY IF EXISTS "Team members can update appointments" ON appointments;
DROP POLICY IF EXISTS "Team members can delete appointments" ON appointments;

CREATE POLICY "Team members can view their company appointments"
  ON appointments FOR SELECT TO authenticated
  USING (
    contractor_id IN (
      SELECT tm.contractor_id FROM team_members tm
      WHERE tm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Team members can create appointments"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK (
    contractor_id IN (
      SELECT tm.contractor_id FROM team_members tm
      WHERE tm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Team members can update appointments"
  ON appointments FOR UPDATE TO authenticated
  USING (
    contractor_id IN (
      SELECT tm.contractor_id FROM team_members tm
      WHERE tm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Team members can delete appointments"
  ON appointments FOR DELETE TO authenticated
  USING (
    contractor_id IN (
      SELECT tm.contractor_id FROM team_members tm
      WHERE tm.user_id = (SELECT auth.uid())
    )
  );

DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
