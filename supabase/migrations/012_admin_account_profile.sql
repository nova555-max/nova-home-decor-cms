-- Admin account profile fields for CMS-managed account settings

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
