-- Optional YouTube social link for public footer
ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;
