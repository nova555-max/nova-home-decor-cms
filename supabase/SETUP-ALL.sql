-- ============================================================
-- Nova Home Decor CMS — RUN ONCE in Supabase SQL Editor
-- Dashboard → SQL → New query → Paste all → Run
-- ============================================================

-- ========== 001_initial_schema.sql ==========

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_logo TEXT,
  company_name TEXT NOT NULL DEFAULT 'Nova Home Decor',
  phone_number TEXT,
  whatsapp_number TEXT,
  google_maps_url TEXT,
  company_address TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO website_settings (company_name)
SELECT 'Nova Home Decor'
WHERE NOT EXISTS (SELECT 1 FROM website_settings);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (is_active, sort_order);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(12, 2),
  image_url TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  client_name TEXT,
  location TEXT,
  cover_image TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  completed_at DATE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_active ON projects (is_active, sort_order);

CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_active ON gallery_items (is_active, sort_order);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_website_settings_updated ON website_settings;
CREATE TRIGGER trg_website_settings_updated
  BEFORE UPDATE ON website_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_gallery_updated ON gallery_items;
CREATE TRIGGER trg_gallery_updated
  BEFORE UPDATE ON gallery_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read website settings" ON website_settings;
CREATE POLICY "Public read website settings"
  ON website_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active categories" ON categories;
CREATE POLICY "Public read active categories"
  ON categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active products" ON products;
CREATE POLICY "Public read active products"
  ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active projects" ON projects;
CREATE POLICY "Public read active projects"
  ON projects FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active gallery" ON gallery_items;
CREATE POLICY "Public read active gallery"
  ON gallery_items FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin manage website settings" ON website_settings;
CREATE POLICY "Admin manage website settings"
  ON website_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage categories" ON categories;
CREATE POLICY "Admin manage categories"
  ON categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage products" ON products;
CREATE POLICY "Admin manage products"
  ON products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage projects" ON projects;
CREATE POLICY "Admin manage projects"
  ON projects FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage gallery" ON gallery_items;
CREATE POLICY "Admin manage gallery"
  ON gallery_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin read all categories" ON categories;
CREATE POLICY "Admin read all categories"
  ON categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin read all products" ON products;
CREATE POLICY "Admin read all products"
  ON products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin read all projects" ON projects;
CREATE POLICY "Admin read all projects"
  ON projects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin read all gallery" ON gallery_items;
CREATE POLICY "Admin read all gallery"
  ON gallery_items FOR SELECT TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-uploads', 'cms-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
CREATE POLICY "Public read uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-uploads');

DROP POLICY IF EXISTS "Admin upload files" ON storage.objects;
CREATE POLICY "Admin upload files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cms-uploads');

DROP POLICY IF EXISTS "Admin update files" ON storage.objects;
CREATE POLICY "Admin update files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cms-uploads');

DROP POLICY IF EXISTS "Admin delete files" ON storage.objects;
CREATE POLICY "Admin delete files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cms-uploads');

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE website_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE projects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gallery_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== 002_cms_extensions.sql ==========

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS email_addresses JSONB NOT NULL DEFAULT '[]';

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name_i18n JSONB,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_i18n JSONB,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS title_i18n JSONB,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB;

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS title_i18n JSONB,
  ADD COLUMN IF NOT EXISTS caption_i18n JSONB;

CREATE TABLE IF NOT EXISTS homepage_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero JSONB NOT NULL DEFAULT '{"ku":{},"ar":{},"en":{}}',
  about JSONB NOT NULL DEFAULT '{"ku":{},"ar":{},"en":{}}',
  why_choose_us JSONB NOT NULL DEFAULT '{"ku":{"title":"","items":[]},"ar":{"title":"","items":[]},"en":{"title":"","items":[]}}',
  section_visibility JSONB NOT NULL DEFAULT '{"hero":true,"about":true,"categories":true,"featured_products":true,"latest_products":true,"projects":true,"gallery":true,"why_choose_us":true,"testimonials":true,"footer":true}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO homepage_content (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM homepage_content);

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_i18n JSONB NOT NULL DEFAULT '{"ku":"","ar":"","en":""}',
  content_i18n JSONB NOT NULL DEFAULT '{"ku":"","ar":"","en":""}',
  role_i18n JSONB NOT NULL DEFAULT '{"ku":"","ar":"","en":""}',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials (is_active, sort_order);

DROP TRIGGER IF EXISTS trg_homepage_updated ON homepage_content;
CREATE TRIGGER trg_homepage_updated
  BEFORE UPDATE ON homepage_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_testimonials_updated ON testimonials;
CREATE TRIGGER trg_testimonials_updated
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read homepage" ON homepage_content;
CREATE POLICY "Public read homepage"
  ON homepage_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage homepage" ON homepage_content;
CREATE POLICY "Admin manage homepage"
  ON homepage_content FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read active testimonials" ON testimonials;
CREATE POLICY "Public read active testimonials"
  ON testimonials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin read all testimonials" ON testimonials;
CREATE POLICY "Admin read all testimonials"
  ON testimonials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage testimonials" ON testimonials;
CREATE POLICY "Admin manage testimonials"
  ON testimonials FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE homepage_content;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE testimonials;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== 003_premium_features.sql ==========

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS related_product_ids UUID[] DEFAULT '{}';

-- ========== 004_premium_cms.sql ==========

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  folder TEXT DEFAULT 'media',
  alt_text TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read media" ON media_assets;
CREATE POLICY "Public read media" ON media_assets
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Auth manage media" ON media_assets;
CREATE POLICY "Auth manage media" ON media_assets
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'published'));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image TEXT;

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image TEXT;

CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON media_assets (folder);
CREATE INDEX IF NOT EXISTS idx_media_assets_deleted ON media_assets (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON categories (deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects (deleted_at);
CREATE INDEX IF NOT EXISTS idx_gallery_deleted ON gallery_items (deleted_at);

-- ========== 005_seed_categories.sql ==========

INSERT INTO categories (name, slug, name_i18n, sort_order, is_active)
VALUES
  ('دەگا', 'daga', '{"ku":"دەگا","ar":"باب","en":"Door"}'::jsonb, 0, true),
  ('پەنجەرە', 'penjere', '{"ku":"پەنجەرە","ar":"نافذة","en":"Window"}'::jsonb, 1, true),
  ('دیکۆراتی ماڵ', 'decorati-mal', '{"ku":"دیکۆراتی ماڵ","ar":"ديكور منزلي","en":"Home Decor"}'::jsonb, 2, true),
  ('دیکۆراتی تەلەفزیۆن', 'decorati-televizyon', '{"ku":"دیکۆراتی تەلەفزیۆن","ar":"ديكور تلفزيون","en":"TV Decor"}'::jsonb, 3, true)
ON CONFLICT (slug) DO NOTHING;
