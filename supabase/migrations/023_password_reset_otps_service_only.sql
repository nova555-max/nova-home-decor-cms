-- Password reset OTPs: service role only (no client policies).
-- Matches app usage via createServiceClient() only.

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage otps" ON public.password_reset_otps;

REVOKE ALL ON public.password_reset_otps FROM anon, authenticated;
GRANT ALL ON public.password_reset_otps TO service_role;
