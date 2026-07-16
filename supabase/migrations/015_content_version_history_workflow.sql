-- Content version history, audit columns, publish workflow, and PostgREST schema reload

-- Audit / workflow columns on per-key content strings
ALTER TABLE public.website_content_strings
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_website_content_strings_scheduled
  ON public.website_content_strings (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL;

-- Per-change version history (previous_value -> current_value)
CREATE TABLE IF NOT EXISTS public.website_content_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_string_id UUID NOT NULL REFERENCES public.website_content_strings(id) ON DELETE CASCADE,
  content_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  previous_value JSONB,
  current_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_type TEXT NOT NULL DEFAULT 'draft'
    CHECK (change_type IN ('draft', 'publish', 'unpublish', 'restore')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_version_history_string
  ON public.website_content_version_history (content_string_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_content_version_history_key
  ON public.website_content_version_history (content_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_version_history_created
  ON public.website_content_version_history (created_at DESC);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_website_content_strings_updated_at ON public.website_content_strings;
CREATE TRIGGER trg_website_content_strings_updated_at
  BEFORE UPDATE ON public.website_content_strings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_content_version_history_updated_at ON public.website_content_version_history;
CREATE TRIGGER trg_content_version_history_updated_at
  BEFORE UPDATE ON public.website_content_version_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Restore a historical version into draft_value (never overwrites published_value)
CREATE OR REPLACE FUNCTION public.restore_content_version(p_history_id UUID)
RETURNS public.website_content_version_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hist public.website_content_version_history%ROWTYPE;
  v_prev JSONB;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT * INTO v_hist
  FROM public.website_content_version_history
  WHERE id = p_history_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version history entry not found';
  END IF;

  SELECT draft_value INTO v_prev
  FROM public.website_content_strings
  WHERE id = v_hist.content_string_id;

  UPDATE public.website_content_strings
  SET
    draft_value = v_hist.current_value,
    updated_by = auth.uid()
  WHERE id = v_hist.content_string_id;

  INSERT INTO public.website_content_version_history (
    content_string_id,
    content_key,
    version,
    previous_value,
    current_value,
    change_type,
    created_by,
    updated_by
  )
  VALUES (
    v_hist.content_string_id,
    v_hist.content_key,
    (SELECT version FROM public.website_content_strings WHERE id = v_hist.content_string_id),
    v_prev,
    v_hist.current_value,
    'restore',
    auth.uid(),
    auth.uid()
  );

  RETURN v_hist;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_content_version(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_content_version(UUID) TO authenticated;

-- RLS for version history
ALTER TABLE public.website_content_version_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage content version history" ON public.website_content_version_history;
CREATE POLICY "Admins manage content version history"
  ON public.website_content_version_history FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins read content version history" ON public.website_content_version_history;
CREATE POLICY "Admins read content version history"
  ON public.website_content_version_history FOR SELECT
  USING (public.is_active_admin());

COMMENT ON TABLE public.website_content_version_history IS
  'Per-key CMS copy version history with previous_value/current_value and restore_content_version().';

COMMENT ON FUNCTION public.restore_content_version(UUID) IS
  'Restores a historical version into draft_value without overwriting published_value.';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
