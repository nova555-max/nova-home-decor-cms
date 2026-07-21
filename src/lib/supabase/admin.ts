import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env/supabase-public";
import {
  checkRequiredEnv,
  decodeJwtPayload,
  formatMissingEnvError,
  logEnvDiagnostics,
  resolveSupabaseUrlFromKey,
} from "@/lib/env/runtime";

export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function validateServiceRoleKey(key: string): {
  ok: true;
} | { ok: false; error: string } {
  if (!key.startsWith("eyJ")) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY must be the JWT service_role key from Supabase → Settings → API (starts with eyJ). Do not use the anon/publishable key.",
    };
  }

  const payload = decodeJwtPayload(key);
  const role = payload?.role;
  if (role && role !== "service_role") {
    return {
      ok: false,
      error: `SUPABASE_SERVICE_ROLE_KEY JWT role is "${String(role)}" — expected "service_role". You pasted the wrong key (likely anon).`,
    };
  }

  return { ok: true };
}

export function createServiceClient(): SupabaseClient {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    logEnvDiagnostics("[supabase-admin]");
    throw new Error(
      formatMissingEnvError(
        checkRequiredEnv().filter((c) => c.name === "SUPABASE_SERVICE_ROLE_KEY"),
      ),
    );
  }

  const validated = validateServiceRoleKey(serviceRoleKey);
  if (!validated.ok) {
    console.error("[supabase-admin]", validated.error);
    throw new Error(validated.error);
  }

  const { url: envUrl } = requireSupabasePublicEnv();
  const url =
    resolveSupabaseUrlFromKey(undefined, serviceRoleKey) ||
    resolveSupabaseUrlFromKey(envUrl, serviceRoleKey) ||
    envUrl;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
