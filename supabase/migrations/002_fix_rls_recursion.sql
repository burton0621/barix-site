-- ============================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================
-- The original policies caused recursion because checking admin status
-- requires selecting from team_members, which triggers the SELECT policy,
-- which then checks team_members again, and so on.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS
-- to check admin status, then use that function in policies.


-- ============================================
-- STEP 1: Create helper function to check if user is admin
-- ============================================
-- SECURITY DEFINER means this function runs with the privileges of the owner,
-- bypassing RLS. This breaks the recursion loop.

CREATE OR REPLACE FUNCTION is_team_admin(check_contractor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM team_members 
    WHERE user_id = auth.uid() 
      AND contractor_id = check_contractor_id 
      AND role = 'admin'
  );
$$;

-- Function to get user's contractor_id (also bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_contractor_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT contractor_id 
  FROM team_members 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;


-- ============================================
-- STEP 2: Drop existing policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their team" ON team_members;
DROP POLICY IF EXISTS "Invited users can view their invite" ON team_members;
DROP POLICY IF EXISTS "Admins can invite team members" ON team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Admins can remove team members" ON team_members;


-- ============================================
-- STEP 3: Create new policies using helper functions
-- ============================================

-- Policy: Team members can view other members in their company
-- Uses the helper function to avoid recursion
CREATE POLICY "Users can view their team"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    contractor_id = get_user_contractor_id()
  );

-- Policy: Invited users can see their own pending invite
CREATE POLICY "Invited users can view their invite"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Policy: Admins can invite new team members
-- Uses is_team_admin() to check without recursion
CREATE POLICY "Admins can invite team members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_team_admin(contractor_id)
  );

-- Policy: Admins can update team members in their company
CREATE POLICY "Admins can update team members"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (
    is_team_admin(contractor_id)
  );

-- Policy: Admins can remove team members from their company
CREATE POLICY "Admins can remove team members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    is_team_admin(contractor_id)
  );


-- ============================================
-- STEP 4: Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION is_team_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_contractor_id() TO authenticated;


-- ============================================
-- VERIFICATION
-- ============================================
-- After running this, test by:
-- 1. Logging in as an admin user
-- 2. Going to /team page
-- 3. Trying to invite a new team member

