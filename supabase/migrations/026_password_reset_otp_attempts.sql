-- Track failed OTP attempts to prevent brute-force password reset.
ALTER TABLE public.password_reset_otps
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.password_reset_otps.attempt_count IS
  'Failed verification attempts; invalidate OTP when it reaches OTP_MAX_ATTEMPTS.';
