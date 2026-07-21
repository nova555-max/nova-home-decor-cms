import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PUBLIC_ENV_DEFAULTS } from "@/config/public-env-defaults";
import { withAuthCookieOptions } from "@/lib/supabase/cookie-options";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client (singleton).
 * Uses direct NEXT_PUBLIC_* access so Next.js inlines values into the client bundle.
 */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Netlify env.",
    );
  }

  browserClient = createBrowserClient(url, anonKey, {
    cookieOptions: withAuthCookieOptions(),
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  return browserClient;
}
