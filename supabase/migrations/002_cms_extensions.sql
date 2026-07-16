-- Nova Home Decor CMS - Extensions (i18n, homepage, testimonials, emails)

-- Email addresses on settings
ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS email_addresses JSONB NOT NULL DEFAULT '[]';

-- Localized content columns
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

-- Homepage content (singleton)
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

-- Testimonials
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

-- Triggers
CREATE TRIGGER trg_homepage_updated
  BEFORE UPDATE ON homepage_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_testimonials_updated
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read homepage"
  ON homepage_content FOR SELECT USING (true);

CREATE POLICY "Admin manage homepage"
  ON homepage_content FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read active testimonials"
  ON testimonials FOR SELECT USING (is_active = true);

CREATE POLICY "Admin read all testimonials"
  ON testimonials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage testimonials"
  ON testimonials FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE homepage_content;
ALTER PUBLICATION supabase_realtime ADD TABLE testimonials;
