-- Admin users: one super_admin + editors with granular permissions

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'editor')),
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_super_admin
  ON admin_users (role)
  WHERE role = 'super_admin' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user ON admin_users (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users (is_active, role);

DROP TRIGGER IF EXISTS trg_admin_users_updated ON admin_users;
CREATE TRIGGER trg_admin_users_updated
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read own profile"
  ON admin_users FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Super admin read all profiles"
  ON admin_users FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.is_active = TRUE
    )
  );

CREATE POLICY "Super admin manage editors"
  ON admin_users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.is_active = TRUE
    )
  )
  WITH CHECK (
    role = 'editor'
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.is_active = TRUE
    )
  );
