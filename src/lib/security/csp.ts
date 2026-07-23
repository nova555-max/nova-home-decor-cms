/**
 * Production Content-Security-Policy.
 *
 * `'unsafe-eval'` is required by Google Maps JS (`@react-google-maps/api`).
 * Without it, Chrome reports:
 * "Content Security Policy of your site blocks the use of 'eval' in JavaScript".
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https://fonts.gstatic.com",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://maps.googleapis.com",
    "https://*.googleapis.com",
    "https://nominatim.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
    "https://generativelanguage.googleapis.com",
  ].join(" "),
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: https://*.supabase.co",
  "upgrade-insecure-requests",
].join("; ");
