-- Category icon, color + product related products
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS related_product_ids UUID[] DEFAULT '{}';
