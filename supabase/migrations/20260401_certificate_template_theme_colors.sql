-- Certificate template display options (canvas themes, logo, custom colors)
ALTER TABLE certificate_templates
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'gallery',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_position TEXT DEFAULT 'top-left',
  ADD COLUMN IF NOT EXISTS theme_colors JSONB DEFAULT NULL;

COMMENT ON COLUMN certificate_templates.theme IS 'Built-in canvas theme key (gallery, formal, achievement, classic, …)';
COMMENT ON COLUMN certificate_templates.theme_colors IS 'Optional hex overrides: primary, secondary, accent, background, text';
