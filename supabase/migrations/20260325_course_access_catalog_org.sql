-- Who sees a course in the learner catalog (both individuals and corporate)
-- catalog_visible: hide from catalog without deleting (enrolled users still access via My Courses / link)
-- restricted_organization_id: if set, only members of that org see the course in the catalog

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS catalog_visible BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS restricted_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_catalog_visible
  ON public.courses (catalog_visible)
  WHERE catalog_visible = true AND is_published = true;

CREATE INDEX IF NOT EXISTS idx_courses_restricted_organization
  ON public.courses (restricted_organization_id)
  WHERE restricted_organization_id IS NOT NULL;

COMMENT ON COLUMN public.courses.catalog_visible IS 'When false, course is omitted from the learner catalog; enrollments and direct links still work.';
COMMENT ON COLUMN public.courses.restricted_organization_id IS 'When set, only learners in this organization see the course in the catalog; NULL = any eligible learner.';
