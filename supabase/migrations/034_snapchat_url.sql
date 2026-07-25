-- Snapchat social link; YouTube/Telegram remain in DB but unused by the app UI.
ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS snapchat_url TEXT;
