-- Allow authenticated admins to evaluate RLS helpers again.
-- Migration 008 revoked EXECUTE from authenticated, which broke CMS writes
-- that use the session client (permission denied for function is_active_admin).

GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
