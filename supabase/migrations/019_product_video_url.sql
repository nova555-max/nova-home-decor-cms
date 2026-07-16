-- Optional product video (max 1; duration enforced in CMS UI at 30s)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS video_url TEXT;
