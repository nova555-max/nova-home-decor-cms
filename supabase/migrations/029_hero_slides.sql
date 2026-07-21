-- Hero Slider: up to 10 homepage background slides with optional CTA + schedule

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hero_slides_schedule_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at
  )
);

CREATE INDEX IF NOT EXISTS idx_hero_slides_order
  ON public.hero_slides (display_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_hero_slides_public
  ON public.hero_slides (is_active, display_order)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_hero_slides_updated_at ON public.hero_slides;
CREATE TRIGGER trg_hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hero slides" ON public.hero_slides;
CREATE POLICY "Public read active hero slides"
  ON public.hero_slides
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

DROP POLICY IF EXISTS "Admins manage hero slides" ON public.hero_slides;
CREATE POLICY "Admins manage hero slides"
  ON public.hero_slides
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Cap at 10 active+inactive rows via trigger (admins can soft-disable instead of exceeding)
CREATE OR REPLACE FUNCTION public.hero_slides_enforce_max_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.hero_slides) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 hero slides allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hero_slides_max_count ON public.hero_slides;
CREATE TRIGGER trg_hero_slides_max_count
  BEFORE INSERT ON public.hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.hero_slides_enforce_max_count();

-- Storage: ensure hero-slides folder follows same cms-uploads admin policies (007/008).
-- Explicit path policies for clarity (idempotent with existing bucket policies).

DROP POLICY IF EXISTS "Admins upload hero slides" ON storage.objects;
CREATE POLICY "Admins upload hero slides"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND (storage.foldername(name))[1] = 'hero-slides'
    AND public.is_active_admin()
  );

DROP POLICY IF EXISTS "Admins update hero slides" ON storage.objects;
CREATE POLICY "Admins update hero slides"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND (storage.foldername(name))[1] = 'hero-slides'
    AND public.is_active_admin()
  )
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND (storage.foldername(name))[1] = 'hero-slides'
    AND public.is_active_admin()
  );

DROP POLICY IF EXISTS "Admins delete hero slides" ON storage.objects;
CREATE POLICY "Admins delete hero slides"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND (storage.foldername(name))[1] = 'hero-slides'
    AND public.is_active_admin()
  );

NOTIFY pgrst, 'reload schema';
