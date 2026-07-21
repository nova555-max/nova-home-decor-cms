import { createBrowserClient } from "@supabase/ssr";

import {
  getResolvedSupabasePublicEnv,
  hasSupabasePublicEnv,
} from "@/lib/env/supabase-public";

export function createClient() {
  if (!hasSupabasePublicEnv()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const resolved = getResolvedSupabasePublicEnv();
  if (!resolved) {
    throw new Error("Supabase public env could not be resolved.");
  }

  return createBrowserClient(resolved.url, resolved.anonKey);
}
