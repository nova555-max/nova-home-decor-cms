-- Harden content management schema for QA: previous_version, CRUD indexes, schema reload, seed

ALTER TABLE public.website_content_version_history
  ADD COLUMN IF NOT EXISTS previous_version INTEGER;

UPDATE public.website_content_version_history
SET previous_version = GREATEST(version - 1, 0)
WHERE previous_version IS NULL;

CREATE INDEX IF NOT EXISTS idx_website_content_strings_content_key
  ON public.website_content_strings (content_key);

CREATE INDEX IF NOT EXISTS idx_website_content_strings_created
  ON public.website_content_strings (created_at DESC);

-- Ensure timestamps exist (idempotent)
ALTER TABLE public.website_content_strings
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.website_content_version_history.previous_version IS
  'Version number before this change (for compare/rollback).';

NOTIFY pgrst, 'reload schema';
