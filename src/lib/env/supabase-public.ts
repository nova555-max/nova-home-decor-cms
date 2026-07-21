import {
  formatMissingEnvError,
  getRuntimeEnvSnapshot,
  logEnvDiagnostics,
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
  const anonKey = snap.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return null;

  const url =
    resolveSupabaseUrlFromKey(snap.NEXT_PUBLIC_SUPABASE_URL, anonKey) ||
    snap.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) return null;
  return { url, anonKey };
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

export function requireSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  const resolved = getResolvedSupabasePublicEnv();
  const snap = getRuntimeEnvSnapshot();

  if (!resolved) {
    logEnvDiagnostics("[supabase-public]");
    throw new Error(
      formatMissingEnvError(
        [
          !snap.NEXT_PUBLIC_SUPABASE_URL
            ? {
                name: "NEXT_PUBLIC_SUPABASE_URL",
                status: "missing" as const,
                detail:
                  "Missing. Set NEXT_PUBLIC_SUPABASE_URL in Cloudflare Variables (and Build variables).",
                required: true,
                secret: false,
              }
            : {
                name: "NEXT_PUBLIC_SUPABASE_URL",
                status: "ok" as const,
                detail: snap.NEXT_PUBLIC_SUPABASE_URL,
                required: true,
                secret: false,
              },
          !snap.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? {
                name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                status: "missing" as const,
                detail:
                  "Missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY).",
                required: true,
                secret: false,
              }
            : {
                name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                status: "ok" as const,
                detail: "Present",
                required: true,
                secret: false,
              },
        ].filter((c) => c.status !== "ok"),
      ),
    );
  }

  const mismatch = getSupabaseKeyMismatchDetail();
  if (mismatch) {
    console.error("[supabase-public]", mismatch);
  }

  return resolved;
}
