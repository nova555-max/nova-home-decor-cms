import { PUBLIC_ENV_DEFAULTS } from "@/config/public-env-defaults";
import {
  getRuntimeEnvSnapshot,
  resolveSupabaseUrlFromKey,
} from "@/lib/env/runtime";
import { getSupabaseKeyMismatchDetail } from "@/lib/env/supabase-errors";

/** Shared Supabase public env — works in middleware, server, and client bundles. */
export function getSupabaseUrl(): string | undefined {
  return getRuntimeEnvSnapshot().NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return getRuntimeEnvSnapshot().NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Resolved URL + anon key for Supabase clients (fixes mistyped env URLs). */
export function getResolvedSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} | null {
  const snap = getRuntimeEnvSnapshot();
  const anonKey =
    snap.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const urlRaw =
    snap.NEXT_PUBLIC_SUPABASE_URL ||
    PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_URL;

  const url = resolveSupabaseUrlFromKey(urlRaw, anonKey) || urlRaw;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function hasSupabasePublicEnv(): boolean {
  const resolved = getResolvedSupabasePublicEnv();
  if (!resolved) return false;
  return (
    !resolved.url.includes("your-project") &&
    !resolved.anonKey.includes("your-anon")
  );
}

/**
 * Always returns a usable public env pair.
 * Falls back to baked-in project defaults so a missing Cloudflare Build var
 * cannot crash the entire client app.
 */
export function requireSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  const resolved = getResolvedSupabasePublicEnv();
  if (resolved) {
    const mismatch = getSupabaseKeyMismatchDetail();
    if (mismatch) {
      console.error("[supabase-public]", mismatch);
    }
    return resolved;
  }

  // Absolute last resort — should be unreachable when defaults exist.
  return {
    url: PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
