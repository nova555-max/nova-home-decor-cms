-- Lifetime single administrator (super_admin). Editors can never become admin.
DROP INDEX IF EXISTS public.idx_one_active_super_admin;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_super_admin_ever
  ON public.admin_users (role)
  WHERE role = 'super_admin';

CREATE OR REPLACE FUNCTION public.enforce_single_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'super_admin' THEN
      IF EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE role = 'super_admin'
          AND id IS DISTINCT FROM NEW.id
      ) THEN
        RAISE EXCEPTION 'Only one administrator account is allowed.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'super_admin' AND OLD.role IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Employees cannot become administrator.';
    END IF;
    IF NEW.role = 'super_admin' AND OLD.role = 'super_admin' THEN
      RETURN NEW;
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role AND OLD.role = 'super_admin' THEN
      RAISE EXCEPTION 'Administrator role cannot be changed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_super_admin ON public.admin_users;
CREATE TRIGGER trg_enforce_single_super_admin
  BEFORE INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_super_admin();
