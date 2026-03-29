-- Align certificate_templates write access with CourseManagementGuard:
-- corporate owner / admin / instructor (organization_members), platform roles on profiles,
-- or row creator (created_by). Omit profiles.permissions — many DBs do not define that column.
-- Without this, corporate users can open the UI but UPDATE returns 0 rows under RLS.

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with manage_courses can manage certificate templates" ON public.certificate_templates;
DROP POLICY IF EXISTS "Admins and instructors can manage certificate templates" ON public.certificate_templates;
DROP POLICY IF EXISTS "Manage courses users can manage certificate templates" ON public.certificate_templates;

-- Keep public read for authenticated users (certificate generation, template picker).
DROP POLICY IF EXISTS "Authenticated users can view certificate templates" ON public.certificate_templates;
CREATE POLICY "Authenticated users can view certificate templates"
  ON public.certificate_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers and creators can manage certificate templates"
  ON public.certificate_templates
  FOR ALL
  TO authenticated
  USING (
    certificate_templates.created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role, '')) IN (
          'admin',
          'super_admin',
          'system_admin',
          'instructor'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND (
          om.status IS NULL
          OR lower(trim(both FROM om.status::text)) = 'active'
        )
        AND om.role IN (
          'owner',
          'organization_owner',
          'admin',
          'corporate_admin',
          'instructor'
        )
    )
  )
  WITH CHECK (
    certificate_templates.created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role, '')) IN (
          'admin',
          'super_admin',
          'system_admin',
          'instructor'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND (
          om.status IS NULL
          OR lower(trim(both FROM om.status::text)) = 'active'
        )
        AND om.role IN (
          'owner',
          'organization_owner',
          'admin',
          'corporate_admin',
          'instructor'
        )
    )
  );

COMMENT ON POLICY "Course managers and creators can manage certificate templates" ON public.certificate_templates IS
  'Matches app CourseManagementGuard: org owner/admin/instructor, profiles.role admin/system_admin/instructor, or template creator.';
