-- Per-key content strings with draft/publish, version history, and audit logs

-- Admin profile columns (from 012 if missing)
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT
    CHECK (preferred_locale IS NULL OR preferred_locale IN ('ku', 'ar', 'en')),
  ADD COLUMN IF NOT EXISTS preferred_theme TEXT
    CHECK (preferred_theme IS NULL OR preferred_theme IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username
  ON public.admin_users (LOWER(username))
  WHERE username IS NOT NULL AND username <> '';

DROP POLICY IF EXISTS "Admins update own profile" ON public.admin_users;
CREATE POLICY "Admins update own profile"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Drop legacy singleton table if present (013 never applied on remote)
DROP TABLE IF EXISTS public.website_content_strings CASCADE;

CREATE TABLE public.website_content_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE,
  draft_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_content_strings_status
  ON public.website_content_strings (status);

CREATE INDEX IF NOT EXISTS idx_website_content_strings_updated
  ON public.website_content_strings (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.website_content_publish_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  published JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_publish_snapshots_created
  ON public.website_content_publish_snapshots (created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  actor_email TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs (created_at DESC);

ALTER TABLE public.website_content_strings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content_publish_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published content strings" ON public.website_content_strings;
CREATE POLICY "Public read published content strings"
  ON public.website_content_strings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage content strings" ON public.website_content_strings;
CREATE POLICY "Admins manage content strings"
  ON public.website_content_strings FOR ALL
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

DROP POLICY IF EXISTS "Admins manage content snapshots" ON public.website_content_publish_snapshots;
CREATE POLICY "Admins manage content snapshots"
  ON public.website_content_publish_snapshots FOR ALL
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_active_admin());

DROP POLICY IF EXISTS "Admins write audit logs" ON public.audit_logs;
CREATE POLICY "Admins write audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (is_active_admin());

COMMENT ON TABLE public.website_content_strings IS
  'Per-key CMS copy with draft_value/published_value (ku/ar/en JSON), version, status, published_at, and per-key versions JSON history.';

COMMENT ON TABLE public.audit_logs IS
  'Admin audit trail for CMS security and compliance.';

-- Ensure SEO metadata exists for QA and production
UPDATE public.website_settings
SET
  seo_title = COALESCE(NULLIF(TRIM(seo_title), ''), NULLIF(TRIM(company_name), ''), 'Nova Home Decor'),
  seo_description = COALESCE(
    NULLIF(TRIM(seo_description), ''),
    'Luxury doors, windows, kitchens, lighting and interior décor — Nova Home Decor showroom.'
  )
WHERE seo_title IS NULL OR TRIM(seo_title) = '' OR seo_description IS NULL OR TRIM(seo_description) = '';
