-- If you already ran an older 20260330 script (strict status = 'active' only), run this to
-- align policies with the current app (allows NULL status on organization_members).

DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;

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
