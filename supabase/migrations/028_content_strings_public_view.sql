-- Public must not read draft_value / versions even on published rows.
-- Expose a security-barrier view with published columns only.

CREATE OR REPLACE VIEW public.website_content_strings_public
WITH (security_barrier = true)
AS
SELECT
  id,
  content_key,
  published_value,
  version,
  status,
  published_at,
  updated_at
FROM public.website_content_strings
WHERE status = 'published';

REVOKE ALL ON public.website_content_strings_public FROM PUBLIC;
GRANT SELECT ON public.website_content_strings_public TO anon, authenticated;

-- Tighten table SELECT for anon: revoke direct table SELECT if present,
-- then re-grant only via the view for public consumers.
-- Admins still need table SELECT via authenticated + existing admin policies.
REVOKE SELECT ON public.website_content_strings FROM anon;

-- Keep authenticated SELECT on the table for CMS editors (RLS still applies).
-- Anon public site should query website_content_strings_public instead.
