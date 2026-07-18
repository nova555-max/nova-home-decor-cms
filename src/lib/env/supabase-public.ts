import {
  formatMissingEnvError,
  getRuntimeEnvSnapshot,
  logEnvDiagnostics,
} from "@/lib/env/runtime";

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
  const snap = getRuntimeEnvSnapshot();
  const url = snap.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = snap.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    logEnvDiagnostics("[supabase-public]");
    throw new Error(
      formatMissingEnvError(
        [
          !url
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
                detail: url,
                required: true,
                secret: false,
              },
          !anonKey
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

  return { url, anonKey };
}
