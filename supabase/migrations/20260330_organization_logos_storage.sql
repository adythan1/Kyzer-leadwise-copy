-- organization-logos: public read, org-scoped writes (matches app path {organization_id}/...)
-- Apply in Supabase SQL editor or: supabase db push

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;

CREATE POLICY "Public read organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Organization members can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND split_part(name, '/', 1) = om.organization_id::text
      AND (
        om.status IS NULL
        OR lower(trim(both from om.status::text)) = 'active'
      )
  )
);

CREATE POLICY "Organization members can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND split_part(name, '/', 1) = om.organization_id::text
      AND (
        om.status IS NULL
        OR lower(trim(both from om.status::text)) = 'active'
      )
  )
)
WITH CHECK (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND split_part(name, '/', 1) = om.organization_id::text
      AND (
        om.status IS NULL
        OR lower(trim(both from om.status::text)) = 'active'
      )
  )
);

CREATE POLICY "Organization members can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND split_part(name, '/', 1) = om.organization_id::text
      AND (
        om.status IS NULL
        OR lower(trim(both from om.status::text)) = 'active'
      )
  )
);
