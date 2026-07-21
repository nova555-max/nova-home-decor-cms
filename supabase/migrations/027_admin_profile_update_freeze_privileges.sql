-- Prevent privilege escalation via "Admins update own profile" RLS.
-- Authenticated users may update their own profile fields, but cannot
-- change role, permissions, is_active, auth_user_id, email, or created_by.

CREATE OR REPLACE FUNCTION public.admin_users_prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    -- Super-admins acting via service role bypass RLS; this trigger still
    -- runs. Allow privilege changes only when the session has no JWT
    -- (service_role) or when the caller is already a super_admin.
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.is_active = true
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Privilege fields on admin_users cannot be changed by this user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_users_prevent_privilege_escalation
  ON public.admin_users;

CREATE TRIGGER trg_admin_users_prevent_privilege_escalation
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_users_prevent_privilege_escalation();

-- Harden self-update policy: keep USING on auth.uid, WITH CHECK freezes privileges.
DROP POLICY IF EXISTS "Admins update own profile" ON public.admin_users;

CREATE POLICY "Admins update own profile"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id
    AND role = (SELECT au.role FROM public.admin_users au WHERE au.id = id)
    AND permissions = (SELECT au.permissions FROM public.admin_users au WHERE au.id = id)
    AND is_active = (SELECT au.is_active FROM public.admin_users au WHERE au.id = id)
    AND auth_user_id = (SELECT au.auth_user_id FROM public.admin_users au WHERE au.id = id)
    AND email = (SELECT au.email FROM public.admin_users au WHERE au.id = id)
  );
