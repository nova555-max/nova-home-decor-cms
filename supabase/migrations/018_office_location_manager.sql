-- Office Location Manager: structured office locations (multi-ready, one active)

CREATE TABLE IF NOT EXISTS public.office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  country TEXT,
  city TEXT,
  district TEXT,
  street TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT office_locations_coords_check CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_office_locations_single_active
  ON public.office_locations ((is_active))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_office_locations_sort
  ON public.office_locations (sort_order, updated_at DESC);

DROP TRIGGER IF EXISTS trg_office_locations_updated_at ON public.office_locations;
CREATE TRIGGER trg_office_locations_updated_at
  BEFORE UPDATE ON public.office_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active office" ON public.office_locations;
CREATE POLICY "Public read active office"
  ON public.office_locations FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage office locations" ON public.office_locations;
CREATE POLICY "Admins manage office locations"
  ON public.office_locations FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Seed from existing website_settings coordinates when present
INSERT INTO public.office_locations (
  name,
  latitude,
  longitude,
  country,
  city,
  is_active,
  sort_order
)
SELECT
  COALESCE(NULLIF(TRIM(company_name), ''), 'Nova Home Decor') || ' - Main Office',
  latitude,
  longitude,
  NULL,
  NULL,
  true,
  0
FROM public.website_settings
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.office_locations WHERE is_active = true)
LIMIT 1;

NOTIFY pgrst, 'reload schema';
