-- Backfill corporate-authored courses so they are private to the author's organization
-- and free for that organization's employees.
--
-- Policy target:
-- - Only system admins can create globally visible paid/trial courses by default.
-- - Corporate-authored courses should be organization-restricted and free.

UPDATE courses AS c
SET
  restricted_organization_id = p.organization_id,
  price = 0,
  is_free_trial = false,
  updated_at = NOW()
FROM profiles AS p
WHERE c.created_by = p.id
  AND p.organization_id IS NOT NULL
  AND p.role NOT IN ('system_admin', 'admin')
  AND (c.restricted_organization_id IS NULL OR c.restricted_organization_id <> p.organization_id);
