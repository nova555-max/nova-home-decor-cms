/**
 * Public (non-secret) defaults for the active Supabase project.
 * Used when host Build/Runtime env vars are missing so the client bundle
 * does not crash with empty NEXT_PUBLIC_* values.
 *
 * Anon / publishable keys are safe to embed — they are public by design (RLS protects data).
 * Never put SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, or GEMINI_API_KEY here.
 *
 * Active project: zfsoeketfjnnpirglosq (admin_users + Auth users live here).
 * Prefer the legacy anon JWT for Auth/Realtime reliability on Netlify.
 */
export const PUBLIC_ENV_DEFAULTS = {
  NEXT_PUBLIC_SUPABASE_URL: "https://zfsoeketfjnnpirglosq.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmc29la2V0ZmpubnBpcmdsb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjI1NjAsImV4cCI6MjA5OTUzODU2MH0.1bpzOD3aOGz88h-C_pPtUopWPcMYW3b2OxR2t-ioc40",
  // Prefer setting NEXT_PUBLIC_APP_URL in Netlify UI to your real *.netlify.app URL.
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_DEFAULT_LOCALE: "ku" as const,
  SUPER_ADMIN_EMAIL: "novahome756@gmail.com",
  RESEND_FROM_EMAIL: "Nova Home Decor <onboarding@resend.dev>",
} as const;

function clean(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Direct property access so Next.js inlines NEXT_PUBLIC_* in client bundles. */
export function readPublicEnvFromProcess() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
      clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    // Netlify provides URL / DEPLOY_PRIME_URL at build time.
    NEXT_PUBLIC_APP_URL:
      clean(process.env.NEXT_PUBLIC_APP_URL) ||
      clean(process.env.URL) ||
      clean(process.env.DEPLOY_PRIME_URL),
    NEXT_PUBLIC_DEFAULT_LOCALE:
      clean(process.env.NEXT_PUBLIC_DEFAULT_LOCALE) ||
      PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_DEFAULT_LOCALE,
    SUPER_ADMIN_EMAIL: clean(process.env.SUPER_ADMIN_EMAIL),
    RESEND_FROM_EMAIL: clean(process.env.RESEND_FROM_EMAIL),
  };
}

export function resolvePublicEnvWithDefaults() {
  const raw = readPublicEnvFromProcess();
  return {
    NEXT_PUBLIC_SUPABASE_URL:
      raw.NEXT_PUBLIC_SUPABASE_URL ||
      PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      raw.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL:
      raw.NEXT_PUBLIC_APP_URL || PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE:
      raw.NEXT_PUBLIC_DEFAULT_LOCALE ||
      PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_DEFAULT_LOCALE,
    SUPER_ADMIN_EMAIL:
      raw.SUPER_ADMIN_EMAIL || PUBLIC_ENV_DEFAULTS.SUPER_ADMIN_EMAIL,
    RESEND_FROM_EMAIL:
      raw.RESEND_FROM_EMAIL || PUBLIC_ENV_DEFAULTS.RESEND_FROM_EMAIL,
  };
}
