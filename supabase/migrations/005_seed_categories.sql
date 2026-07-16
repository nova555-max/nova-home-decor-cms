-- Default Nova Home Decor categories (optional seed)
-- Run AFTER migrations 001–004

INSERT INTO categories (name, slug, name_i18n, sort_order, is_active)
VALUES
  (
    'دەگا',
    'daga',
    '{"ku":"دەگا","ar":"باب","en":"Door"}'::jsonb,
    0,
    true
  ),
  (
    'پەنجەرە',
    'penjere',
    '{"ku":"پەنجەرە","ar":"نافذة","en":"Window"}'::jsonb,
    1,
    true
  ),
  (
    'دیکۆراتی ماڵ',
    'decorati-mal',
    '{"ku":"دیکۆراتی ماڵ","ar":"ديكور منزلي","en":"Home Decor"}'::jsonb,
    2,
    true
  ),
  (
    'دیکۆراتی تەلەفزیۆن',
    'decorati-televizyon',
    '{"ku":"دیکۆراتی تەلەفزیۆن","ar":"ديكور تلفزيون","en":"TV Decor"}'::jsonb,
    3,
    true
  )
ON CONFLICT (slug) DO NOTHING;
