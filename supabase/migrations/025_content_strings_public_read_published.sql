-- Public can only read published content strings (hide drafts).
DROP POLICY IF EXISTS "Public read published content strings"
  ON public.website_content_strings;

CREATE POLICY "Public read published content strings"
  ON public.website_content_strings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Ensure anon cannot update/delete via table grants alone (RLS already blocks).
REVOKE INSERT, UPDATE, DELETE ON public.website_content_strings FROM anon;
