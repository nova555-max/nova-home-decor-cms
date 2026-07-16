-- Password reset OTPs (6-digit codes, hashed at rest)
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email
  ON public.password_reset_otps (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires
  ON public.password_reset_otps (expires_at);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- No public policies — service role only
DROP POLICY IF EXISTS "Service role manage otps" ON public.password_reset_otps;
