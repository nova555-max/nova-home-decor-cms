-- Centralized website copy management (draft / publish / version history)

CREATE TABLE IF NOT EXISTS website_content_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drafts JSONB NOT NULL DEFAULT '{}'::jsonb,
  published JSONB NOT NULL DEFAULT '{}'::jsonb,
  versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO website_content_strings (drafts, published)
SELECT '{}'::jsonb, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM website_content_strings LIMIT 1);

ALTER TABLE website_content_strings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published content strings"
  ON website_content_strings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage content strings"
  ON website_content_strings FOR ALL
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

COMMENT ON TABLE website_content_strings IS
  'Singleton store for CMS-managed public UI copy. Keys are dot-paths like hero.luxury_label with ku/ar/en values.';
