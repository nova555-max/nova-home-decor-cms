-- Settings persistence: theme + contact extras
ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS theme_colors JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS telegram_url TEXT,
  ADD COLUMN IF NOT EXISTS working_hours TEXT;

COMMENT ON COLUMN website_settings.theme_colors IS 'Showroom theme palette JSON';
COMMENT ON COLUMN website_settings.company_description IS 'Company description for showroom';
COMMENT ON COLUMN website_settings.working_hours IS 'Working hours text shown on contact section';
