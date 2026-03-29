-- Public URL for branding (e.g. Supabase Storage bucket organization-logos)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.organizations.logo_url IS 'Public URL for company logo; uploaded via application to organization-logos bucket.';
