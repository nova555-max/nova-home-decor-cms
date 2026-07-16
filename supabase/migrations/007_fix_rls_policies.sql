-- Secure RLS policies for Nova Home Decor CMS
-- Maps user-facing names: settings -> website_settings, gallery -> gallery_items
-- Admin access requires an active row in admin_users linked to auth.uid().

-- ============================================================
-- HELPERS (SECURITY DEFINER avoids RLS recursion on admin_users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================
-- WEBSITE SETTINGS (settings)
-- ============================================================
DROP POLICY IF EXISTS "Public read website settings" ON public.website_settings;
DROP POLICY IF EXISTS "Admin manage website settings" ON public.website_settings;

CREATE POLICY "Public read website settings"
  ON public.website_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage website settings"
  ON public.website_settings
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admin read all categories" ON public.categories;

CREATE POLICY "Public read published categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "Public read active products" ON public.products;
DROP POLICY IF EXISTS "Admin manage products" ON public.products;
DROP POLICY IF EXISTS "Admin read all products" ON public.products;

CREATE POLICY "Public read published products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND status = 'published'
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins manage products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- PROJECTS
-- ============================================================
DROP POLICY IF EXISTS "Public read active projects" ON public.projects;
DROP POLICY IF EXISTS "Admin manage projects" ON public.projects;
DROP POLICY IF EXISTS "Admin read all projects" ON public.projects;

CREATE POLICY "Public read published projects"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- GALLERY (gallery_items)
-- ============================================================
DROP POLICY IF EXISTS "Public read active gallery" ON public.gallery_items;
DROP POLICY IF EXISTS "Admin manage gallery" ON public.gallery_items;
DROP POLICY IF EXISTS "Admin read all gallery" ON public.gallery_items;

CREATE POLICY "Public read published gallery"
  ON public.gallery_items
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins manage gallery"
  ON public.gallery_items
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- MEDIA ASSETS
-- ============================================================
DROP POLICY IF EXISTS "Public read media" ON public.media_assets;
DROP POLICY IF EXISTS "Auth manage media" ON public.media_assets;

CREATE POLICY "Public read media"
  ON public.media_assets
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Admins manage media"
  ON public.media_assets
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- HOMEPAGE CONTENT (hero banners / sections)
-- ============================================================
DROP POLICY IF EXISTS "Public read homepage" ON public.homepage_content;
DROP POLICY IF EXISTS "Admin manage homepage" ON public.homepage_content;

CREATE POLICY "Public read homepage"
  ON public.homepage_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage homepage"
  ON public.homepage_content
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- TESTIMONIALS
-- ============================================================
DROP POLICY IF EXISTS "Public read active testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admin read all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admin manage testimonials" ON public.testimonials;

CREATE POLICY "Public read published testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "Admins manage testimonials"
  ON public.testimonials
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ============================================================
-- ADMIN USERS
-- ============================================================
DROP POLICY IF EXISTS "Admin read own profile" ON public.admin_users;
DROP POLICY IF EXISTS "Super admin read all profiles" ON public.admin_users;
DROP POLICY IF EXISTS "Super admin manage editors" ON public.admin_users;

CREATE POLICY "Admins read own profile"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Super admins read all profiles"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins manage editors"
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (
    public.is_super_admin()
    AND role = 'editor'
  );

-- ============================================================
-- STORAGE: cms-uploads bucket
-- ============================================================
DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admin update files" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete files" ON storage.objects;

CREATE POLICY "Public read uploads"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'cms-uploads');

CREATE POLICY "Admins upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );

CREATE POLICY "Admins update files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  )
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );

CREATE POLICY "Admins delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cms-uploads'
    AND public.is_active_admin()
  );
