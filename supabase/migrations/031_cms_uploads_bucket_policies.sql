-- Ensure cms-uploads bucket exists and is public for product/media images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-uploads', 'cms-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Re-assert admin write policies (idempotent).
DROP POLICY IF EXISTS "Admin upload files" ON storage.objects;
CREATE POLICY "Admin upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );

DROP POLICY IF EXISTS "Admin update files" ON storage.objects;
CREATE POLICY "Admin update files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  )
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );

DROP POLICY IF EXISTS "Admin delete files" ON storage.objects;
CREATE POLICY "Admin delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );

DROP POLICY IF EXISTS "Admins read uploads" ON storage.objects;
CREATE POLICY "Admins read uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );
