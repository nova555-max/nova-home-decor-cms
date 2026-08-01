-- Dedicated public Storage bucket for hero slider images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero_slides',
  'hero_slides',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read hero_slides" ON storage.objects;
CREATE POLICY "Public read hero_slides"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'hero_slides');

DROP POLICY IF EXISTS "Admins upload hero_slides bucket" ON storage.objects;
CREATE POLICY "Admins upload hero_slides bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hero_slides' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins update hero_slides bucket" ON storage.objects;
CREATE POLICY "Admins update hero_slides bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hero_slides' AND public.is_active_admin())
  WITH CHECK (bucket_id = 'hero_slides' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins delete hero_slides bucket" ON storage.objects;
CREATE POLICY "Admins delete hero_slides bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'hero_slides' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins read all hero slides" ON public.hero_slides;
CREATE POLICY "Admins read all hero slides"
  ON public.hero_slides
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());
