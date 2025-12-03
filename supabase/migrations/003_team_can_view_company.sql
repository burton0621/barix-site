-- ============================================
-- Allow Team Members to View Company Profile
-- ============================================
-- By default, contractor_profiles might only be readable by the owner.
-- We need to allow all team members to read their company's profile
-- so they can see the company name, logo, etc. in the dashboard.

-- Create a policy that allows team members to read their company's profile
-- We use the get_user_contractor_id() function from the previous migration
-- to avoid recursion issues.

-- First, drop the policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Team members can view company profile" ON contractor_profiles;

-- Create policy: Allow authenticated users to view the contractor_profile
-- that matches their team membership's contractor_id
CREATE POLICY "Team members can view company profile"
  ON contractor_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = get_user_contractor_id()
    OR id = auth.uid()  -- Also allow owners who might not have team_members entry yet
  );


-- ============================================
-- Verification
-- ============================================
-- After running this:
-- 1. Log in as an invited team member
-- 2. The company name and logo should now appear correctly in the navbar

