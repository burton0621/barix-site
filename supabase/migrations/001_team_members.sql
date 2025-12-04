-- Team Members Table - Idempotent Migration
-- ==========================================
--
-- Assumptions:
--  - contractor_profiles table exists with id as UUID
--  - contractor_profiles.id equals auth.users.id (owner's user ID)
--  - If contractor_profiles uses owner_user_id column instead, see ALTERNATIVE sections below
--
-- Run this in development first, then production.

-- ============================================
-- STEP 1: Ensure required extension exists
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================
-- STEP 2: Create the team_members table
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to Supabase auth.users (NULL until they accept invite and sign up)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Links to the company this user belongs to
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,

  -- User's role within the company
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),

  -- User's display name within the team
  name TEXT,

  -- Email used for invitations (stored lowercase for consistency)
  email TEXT NOT NULL,

  -- Invitation tracking
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure email stored as lowercase (enforces invariant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'c'
      AND t.relname = 'team_members'
      AND c.conname = 'team_members_email_lowercase'
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_email_lowercase CHECK (email = lower(email));
  END IF;
END;
$$;


-- ============================================
-- STEP 3: Create indexes for performance & uniqueness
-- ============================================
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_contractor_id
  ON team_members(contractor_id);

-- Unique constraint: each user can only be in one company (only for non-null user_ids)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_team_members_unique_user'
  ) THEN
    CREATE UNIQUE INDEX idx_team_members_unique_user
      ON team_members(user_id)
      WHERE user_id IS NOT NULL;
  END IF;
END;
$$;

-- Unique constraint: each email can only be invited once per company (case-insensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_team_members_unique_email_per_company'
  ) THEN
    CREATE UNIQUE INDEX idx_team_members_unique_email_per_company
      ON team_members(contractor_id, lower(email));
  END IF;
END;
$$;


-- ============================================
-- STEP 4: Enable Row Level Security
-- ============================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;


-- ============================================
-- STEP 5: Create RLS Policies (drop first for idempotency)
-- ============================================

-- Drop existing policies if they exist (use exact policy names)
DROP POLICY IF EXISTS "Users can view their team" ON team_members;
DROP POLICY IF EXISTS "Invited users can view their invite" ON team_members;
DROP POLICY IF EXISTS "Admins can invite team members" ON team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Admins can remove team members" ON team_members;

-- Policy: Team members can view other members in their company
CREATE POLICY "Users can view their team"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    contractor_id IN (
      SELECT tm.contractor_id
      FROM team_members tm
      WHERE tm.user_id = (SELECT auth.uid())
    )
  );

-- Policy: Invited users can see their own pending invite (before they have user_id)
CREATE POLICY "Invited users can view their invite"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Policy: Admins can invite new team members
CREATE POLICY "Admins can invite team members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members existing
      WHERE existing.user_id = (SELECT auth.uid())
        AND existing.contractor_id = contractor_id
        AND existing.role = 'admin'
    )
  );

-- Policy: Admins can update team members in their company
CREATE POLICY "Admins can update team members"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM team_members existing
      WHERE existing.user_id = (SELECT auth.uid())
        AND existing.contractor_id = team_members.contractor_id
        AND existing.role = 'admin'
    )
  );

-- Policy: Admins can remove team members from their company
CREATE POLICY "Admins can remove team members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM team_members existing
      WHERE existing.user_id = (SELECT auth.uid())
        AND existing.contractor_id = team_members.contractor_id
        AND existing.role = 'admin'
    )
  );


-- ============================================
-- STEP 6: Create updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_updated_at ON team_members;
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ============================================
-- STEP 7: Create trigger to auto-add owner as admin on signup
-- ============================================

-- NOTE: This assumes contractor_profiles.id == owner's auth.users.id
-- If your table uses owner_user_id column, see ALTERNATIVE block at bottom.

CREATE OR REPLACE FUNCTION add_owner_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert owner as admin (only if they don't already exist)
  INSERT INTO team_members (user_id, contractor_id, role, email, accepted_at)
  SELECT
    NEW.id,
    NEW.id,
    'admin',
    lower((SELECT email FROM auth.users WHERE id = NEW.id)),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.user_id = NEW.id
  );

  RETURN NEW;
END;
$$;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_contractor_created ON contractor_profiles;
CREATE TRIGGER on_contractor_created
  AFTER INSERT ON contractor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_admin();

-- Harden function: revoke public execute
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'add_owner_as_admin' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION add_owner_as_admin() FROM public;';
  END IF;
END;
$$;


-- ============================================
-- STEP 8: Migrate existing users to team_members
-- ============================================

-- This adds existing contractor_profiles owners as admins.
-- Uses NOT EXISTS check to avoid duplicates (works with partial unique index)
INSERT INTO team_members (user_id, contractor_id, role, email, accepted_at)
SELECT
  cp.id AS user_id,
  cp.id AS contractor_id,
  'admin' AS role,
  lower(u.email) AS email,
  NOW() AS accepted_at
FROM contractor_profiles cp
JOIN auth.users u ON u.id = cp.id
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.user_id = cp.id
);


-- ============================================
-- ALTERNATIVE: If contractor_profiles uses owner_user_id column
-- ============================================
-- Uncomment and use this instead of STEP 7 & 8 if your table has owner_user_id:
/*
CREATE OR REPLACE FUNCTION add_owner_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO team_members (user_id, contractor_id, role, email, accepted_at)
  SELECT
    NEW.owner_user_id,
    NEW.id,
    'admin',
    lower((SELECT email FROM auth.users WHERE id = NEW.owner_user_id)),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.user_id = NEW.owner_user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contractor_created ON contractor_profiles;
CREATE TRIGGER on_contractor_created
  AFTER INSERT ON contractor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_admin();

-- Migration for existing users with owner_user_id:
INSERT INTO team_members (user_id, contractor_id, role, email, accepted_at)
SELECT
  cp.owner_user_id AS user_id,
  cp.id AS contractor_id,
  'admin' AS role,
  lower(u.email) AS email,
  NOW() AS accepted_at
FROM contractor_profiles cp
JOIN auth.users u ON u.id = cp.owner_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.user_id = cp.owner_user_id
);
*/


-- ============================================
-- VERIFICATION (run separately after migration)
-- ============================================
-- SELECT tm.email, tm.role, tm.accepted_at, cp.company_name
-- FROM team_members tm
-- JOIN contractor_profiles cp ON cp.id = tm.contractor_id
-- ORDER BY tm.created_at;
