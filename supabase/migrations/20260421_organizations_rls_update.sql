-- Helper: check if current user is an admin/owner of a given org
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- Allow org admins/owners to update their own organization
DROP POLICY IF EXISTS org_admins_update_organization ON organizations;
CREATE POLICY org_admins_update_organization ON organizations
  FOR UPDATE USING (public.is_org_admin(id) OR public.is_system_admin());

-- Allow org members to read their own organization
DROP POLICY IF EXISTS org_members_read_organization ON organizations;
CREATE POLICY org_members_read_organization ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR public.is_system_admin()
  );
