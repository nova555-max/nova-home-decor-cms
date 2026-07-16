-- Warehouse / inventory product code entered by admin
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON products (LOWER(sku))
  WHERE sku IS NOT NULL AND sku <> '' AND deleted_at IS NULL;
