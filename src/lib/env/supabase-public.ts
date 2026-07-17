/** Strip accidental REST path suffixes from dashboard copy-paste. */
function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

/** Shared Supabase public env — works in middleware, server, and client bundles. */
export function getSupabaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  return normalizeSupabaseUrl(raw);
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function hasSupabasePublicEnv(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return (
    !!url &&
    !!key &&
    !url.includes("your-project") &&
    !key.includes("your-anon")
  );
}

/** Call before creating Supabase clients — fails with a clear host-env message. */
export function requireSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). On Cloudflare Workers Builds, add them under Settings → Builds → Build variables and secrets.",
    );
  }

  return { url, anonKey };
}
