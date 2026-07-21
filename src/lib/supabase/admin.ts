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

/**
 * Accepts:
 * - Legacy JWT service_role key (eyJ… role=service_role)
 * - Modern secret key (sb_secret_…)
 */
export function validateServiceRoleKey(key: string): {
  ok: true;
} | { ok: false; error: string } {
  if (key.startsWith("sb_secret_")) {
    return { ok: true };
  }

  if (key.startsWith("sb_publishable_") || key.startsWith("sb_anon")) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is a publishable/anon key. Use the secret key (sb_secret_…) or legacy service_role JWT (eyJ… role=service_role).",
    };
  }

  if (!key.startsWith("eyJ")) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY must be the secret key from Supabase → Settings → API (sb_secret_… or legacy JWT starting with eyJ). Do not use the anon/publishable key.",
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

  const { url } = requireSupabasePublicEnv();

  // Always use the same project URL as the browser/anon clients.
  // Do not retarget via service_role JWT `ref` — that caused Netlify to hit an
  // empty project (pdmsbbox…) while public env pointed at zfsoeket… (or vice versa).
  if (serviceRoleKey.startsWith("eyJ")) {
    const keyUrl = resolveSupabaseUrlFromKey(undefined, serviceRoleKey);
    if (keyUrl && keyUrl !== url) {
      console.error(
        "[supabase-admin] SUPABASE_SERVICE_ROLE_KEY project does not match NEXT_PUBLIC_SUPABASE_URL.",
        { keyUrl, url },
      );
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY belongs to ${keyUrl} but the app uses ${url}. ` +
          "Copy the secret/service_role key from the same Supabase project as NEXT_PUBLIC_SUPABASE_URL (zfsoeketfjnnpirglosq), then redeploy.",
      );
    }
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
