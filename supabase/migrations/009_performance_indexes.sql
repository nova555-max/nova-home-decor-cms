-- Nova Home Decor CMS - Performance indexes (009)
-- Composite partial indexes for common admin/public query patterns

-- Admin list: active rows ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_categories_admin_list
  ON categories (sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_admin_list
  ON products (sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_admin_list
  ON projects (sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_admin_list
  ON gallery_items (sort_order)
  WHERE deleted_at IS NULL;

-- Public product filters: category + active + published
CREATE INDEX IF NOT EXISTS idx_products_public_category
  ON products (category_id, sort_order)
  WHERE deleted_at IS NULL AND is_active = true AND status = 'published';

-- Recent activity: updated_at descending
CREATE INDEX IF NOT EXISTS idx_products_updated_at
  ON products (updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_updated_at
  ON projects (updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_created_at
  ON gallery_items (created_at DESC)
  WHERE deleted_at IS NULL;

-- Media library listing
CREATE INDEX IF NOT EXISTS idx_media_assets_created
  ON media_assets (created_at DESC)
  WHERE deleted_at IS NULL;

-- Slug lookups (explicit; UNIQUE already indexes but partial helps soft-deleted)
CREATE INDEX IF NOT EXISTS idx_categories_slug_active
  ON categories (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_slug_active
  ON products (slug)
  WHERE deleted_at IS NULL;
