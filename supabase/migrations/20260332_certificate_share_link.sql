-- Public share links for certificates: opaque token + RPC for anonymous view + mint for owners

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS share_token text;

UPDATE certificates
SET share_token = encode(gen_random_bytes(18), 'hex')
WHERE share_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_share_token_key ON certificates(share_token);

ALTER TABLE certificates
  ALTER COLUMN share_token SET DEFAULT encode(gen_random_bytes(18), 'hex');

-- Owner (authenticated) mints or returns existing share token; SECURITY DEFINER avoids needing broad UPDATE RLS
CREATE OR REPLACE FUNCTION public.mint_certificate_share_token(p_certificate_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.share_token INTO v_token
  FROM certificates c
  WHERE c.id = p_certificate_id AND c.user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_token IS NOT NULL THEN
    RETURN v_token;
  END IF;

  v_token := encode(gen_random_bytes(18), 'hex');

  UPDATE certificates
  SET share_token = v_token
  WHERE id = p_certificate_id AND user_id = auth.uid() AND share_token IS NULL
  RETURNING share_token INTO v_token;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.mint_certificate_share_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mint_certificate_share_token(uuid) TO authenticated;

-- Anonymous / anyone with link: load certificate payload for client-side render (no PII beyond certificate_data already on the cert)
CREATE OR REPLACE FUNCTION public.get_certificate_by_share_token(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'certificate_data', c.certificate_data,
    'template', jsonb_build_object(
      'theme', t.theme,
      'logo_url', t.logo_url,
      'logo_position', t.logo_position,
      'theme_colors', t.theme_colors
    )
  )
  FROM certificates c
  LEFT JOIN certificate_templates t ON t.id = c.template_id
  WHERE c.share_token IS NOT NULL
    AND length(trim(p_token)) >= 16
    AND c.share_token = trim(p_token)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_certificate_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_certificate_by_share_token(text) TO anon, authenticated;
