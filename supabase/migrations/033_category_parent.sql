-- Nested categories: optional parent for subcategory support

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON categories(parent_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN categories.parent_id IS
  'Optional parent category. NULL = top-level. Subcategories nest one level under a parent.';
