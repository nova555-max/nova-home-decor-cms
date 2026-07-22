-- Optional product price currency: USD (dollar) or IQD (Iraqi dinar).
-- Price itself remains nullable (optional).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_currency TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_price_currency_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_currency_check
      CHECK (
        price_currency IS NULL
        OR price_currency IN ('USD', 'IQD')
      );
  END IF;
END $$;

-- Backfill: existing priced products default to USD (previous formatter used USD).
UPDATE public.products
SET price_currency = 'USD'
WHERE price IS NOT NULL
  AND (price_currency IS NULL OR price_currency = '');

UPDATE public.products
SET price_currency = NULL
WHERE price IS NULL;

COMMENT ON COLUMN public.products.price_currency IS
  'Optional currency for price: USD or IQD. Null when price is not set.';

NOTIFY pgrst, 'reload schema';
