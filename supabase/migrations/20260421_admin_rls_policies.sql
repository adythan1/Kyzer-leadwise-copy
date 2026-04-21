-- ─── Update the role check constraint to include all valid roles ──
-- First drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_allowed_check;

-- Normalize any rows with unexpected role values to 'learner'
UPDATE profiles
SET role = 'learner'
WHERE role IS NULL
   OR role NOT IN ('learner', 'instructor', 'admin', 'corporate_admin', 'system_admin', 'owner', 'manager', 'employee');

-- Now add the constraint back with all valid roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_allowed_check
  CHECK (role IN ('learner', 'instructor', 'admin', 'corporate_admin', 'system_admin', 'owner', 'manager', 'employee'));

-- Helper function that bypasses RLS to check if the current user is a system admin.
-- SECURITY DEFINER runs with the privileges of the function owner (postgres),
-- so it can read `profiles` without triggering RLS policies on that table.
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('system_admin', 'admin')
  );
$$;

-- ─── Drop old recursive policies if they exist ───────────────
DROP POLICY IF EXISTS system_admins_read_all_profiles ON profiles;
DROP POLICY IF EXISTS system_admins_update_all_profiles ON profiles;
DROP POLICY IF EXISTS system_admins_insert_profiles ON profiles;
DROP POLICY IF EXISTS system_admins_delete_profiles ON profiles;
DROP POLICY IF EXISTS system_admins_read_all_organizations ON organizations;
DROP POLICY IF EXISTS system_admins_read_all_enrollments ON course_enrollments;

-- ─── Profiles ─────────────────────────────────────────────────
CREATE POLICY system_admins_read_all_profiles ON profiles
  FOR SELECT USING (public.is_system_admin());

CREATE POLICY system_admins_update_all_profiles ON profiles
  FOR UPDATE USING (public.is_system_admin());

CREATE POLICY system_admins_insert_profiles ON profiles
  FOR INSERT WITH CHECK (public.is_system_admin());

CREATE POLICY system_admins_delete_profiles ON profiles
  FOR DELETE USING (public.is_system_admin());

-- ─── Organizations ────────────────────────────────────────────
CREATE POLICY system_admins_read_all_organizations ON organizations
  FOR SELECT USING (public.is_system_admin());

-- ─── Course Enrollments (for stats) ──────────────────────────
CREATE POLICY system_admins_read_all_enrollments ON course_enrollments
  FOR SELECT USING (public.is_system_admin());
