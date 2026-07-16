-- Media library, soft delete, product status, SEO, favicon

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

CREATE POLICY "Public read media" ON media_assets
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Auth manage media" ON media_assets
  FOR ALL USING (auth.role() = 'authenticated');

-- Soft delete
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Product draft / published
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'published'));

-- SEO fields
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
