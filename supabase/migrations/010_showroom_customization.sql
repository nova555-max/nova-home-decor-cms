-- Showroom customization: theme colors on website_settings.
-- Homepage JSONB fields (stats, quote, contact, contact_cta, section_headings)
-- are stored in existing homepage_content columns without schema changes.
-- section_visibility new keys (stats, quote, contact, contact_cta) default to true
-- via application merge in fetchHomepage / getAdminHomepage.

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS theme_colors JSONB DEFAULT NULL;

COMMENT ON COLUMN website_settings.theme_colors IS
  'Showroom theme palette: primary, primary_hover, gold, background, foreground, muted, border, card';
