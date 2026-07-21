/**
 * Runtime environment diagnostics for Netlify / local / Docker / Cloudflare.
 * Never throws at import time — call explicitly from health checks and auth flows.
 */

import {
  PUBLIC_ENV_DEFAULTS,
  readPublicEnvFromProcess,
} from "@/config/public-env-defaults";
import { HOST_ENV_HINT, HOST_SECRET_HINT } from "@/lib/env/host-hints";

export type EnvCheckStatus = "ok" | "missing" | "invalid";

export type EnvCheck = {
  name: string;
  status: EnvCheckStatus;
  detail: string;
  required: boolean;
  secret: boolean;
};

function trimEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Decode JWT payload without verifying signature (format/role checks only). */
export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const json =
      typeof atob === "function"
        ? atob(padded + pad)
        : Buffer.from(padded + pad, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

/** Prefer project ref embedded in a Supabase JWT over a mistyped env URL. */
export function resolveSupabaseUrlFromKey(
  fallbackUrl: string | undefined,
  apiKey: string | undefined,
): string | undefined {
  if (apiKey?.startsWith("eyJ")) {
    const ref = decodeJwtPayload(apiKey)?.ref;
    if (typeof ref === "string" && /^[a-z0-9]{10,}$/i.test(ref)) {
      return `https://${ref.toLowerCase()}.supabase.co`;
    }
  }
  return fallbackUrl ? normalizeSupabaseUrl(fallbackUrl) : undefined;
}

function isLikelySupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.includes("supabase");
  } catch {
    return false;
  }
}

function isLikelyAnonKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return true;
  if (key.startsWith("eyJ")) {
    const payload = decodeJwtPayload(key);
    const role = payload?.role;
    return role === "anon" || role === "authenticated" || role == null;
  }
  return false;
}

function isLikelyServiceRoleKey(key: string): boolean {
  // Modern secret API keys (preferred in new Supabase dashboards)
  if (key.startsWith("sb_secret_")) return true;
  // Legacy service_role JWT
  if (!key.startsWith("eyJ")) return false;
  const payload = decodeJwtPayload(key);
  return payload?.role === "service_role";
}

export function getRuntimeEnvSnapshot() {
  const pub = readPublicEnvFromProcess();
  const anonKey =
    pub.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = trimEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrlRaw =
    pub.NEXT_PUBLIC_SUPABASE_URL ||
    PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer JWT project ref (fixes mistyped NEXT_PUBLIC_SUPABASE_URL → CF 1016).
  const supabaseUrl =
    resolveSupabaseUrlFromKey(supabaseUrlRaw, serviceRoleKey) ||
    resolveSupabaseUrlFromKey(supabaseUrlRaw, anonKey) ||
    supabaseUrlRaw;

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_APP_URL:
      pub.NEXT_PUBLIC_APP_URL || PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE:
      pub.NEXT_PUBLIC_DEFAULT_LOCALE ||
      PUBLIC_ENV_DEFAULTS.NEXT_PUBLIC_DEFAULT_LOCALE,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    RESEND_API_KEY: trimEnv("RESEND_API_KEY"),
    RESEND_FROM_EMAIL:
      trimEnv("RESEND_FROM_EMAIL") || PUBLIC_ENV_DEFAULTS.RESEND_FROM_EMAIL,
    GEMINI_API_KEY: trimEnv("GEMINI_API_KEY"),
    SUPER_ADMIN_EMAIL: (
      pub.SUPER_ADMIN_EMAIL || PUBLIC_ENV_DEFAULTS.SUPER_ADMIN_EMAIL
    ).toLowerCase(),
  };
}

export function checkRequiredEnv(): EnvCheck[] {
  const snap = getRuntimeEnvSnapshot();
  const checks: EnvCheck[] = [];

  if (!snap.NEXT_PUBLIC_SUPABASE_URL) {
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      status: "missing",
      detail:
        `Missing. ${HOST_ENV_HINT}`,
      required: true,
      secret: false,
    });
  } else if (!isLikelySupabaseUrl(snap.NEXT_PUBLIC_SUPABASE_URL)) {
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      status: "invalid",
      detail: `Invalid URL "${snap.NEXT_PUBLIC_SUPABASE_URL}". Expected https://YOUR-PROJECT.supabase.co (no /rest/v1/).`,
      required: true,
      secret: false,
    });
  } else {
    const url = snap.NEXT_PUBLIC_SUPABASE_URL;
    const wrongProject =
      /pdmsbboxhfpexklkqvqr|nblnwcacdlafvgrxfldv/i.test(url ?? "");
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      status: wrongProject ? "invalid" : "ok",
      detail: wrongProject
        ? `Wrong Supabase project (${url}). Admin Auth users live in https://zfsoeketfjnnpirglosq.supabase.co — update Netlify env and redeploy.`
        : snap.NEXT_PUBLIC_SUPABASE_URL!,
      required: true,
      secret: false,
    });
  }

  if (!snap.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      status: "missing",
      detail:
        "Missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      required: true,
      secret: false,
    });
  } else if (!isLikelyAnonKey(snap.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      status: "invalid",
      detail:
        "Value does not look like a Supabase anon/publishable key (eyJ… anon JWT or sb_publishable_…).",
      required: true,
      secret: false,
    });
  } else {
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      status: "ok",
      detail: "Present",
      required: true,
      secret: false,
    });
  }

  if (!snap.SUPABASE_SERVICE_ROLE_KEY) {
    checks.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      status: "missing",
      detail:
        `Missing. ${HOST_SECRET_HINT} Copy service_role from Supabase → Settings → API (not the anon key).`,
      required: true,
      secret: true,
    });
  } else if (!isLikelyServiceRoleKey(snap.SUPABASE_SERVICE_ROLE_KEY)) {
    const role = decodeJwtPayload(snap.SUPABASE_SERVICE_ROLE_KEY)?.role;
    checks.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      status: "invalid",
      detail: role
        ? `Key JWT role is "${String(role)}" but must be "service_role". You likely pasted the anon key.`
        : "Value is not a valid secret key (sb_secret_…) or service_role JWT (eyJ… role=service_role).",
      required: true,
      secret: true,
    });
  } else {
    checks.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      status: "ok",
      detail: snap.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_secret_")
        ? "Present (sb_secret_)"
        : "Present (service_role JWT)",
      required: true,
      secret: true,
    });
  }

  if (snap.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ")) {
    const serviceRef = decodeJwtPayload(snap.SUPABASE_SERVICE_ROLE_KEY)?.ref;
    if (typeof serviceRef === "string") {
      let urlHostRef: string | null = null;
      try {
        const host = new URL(snap.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
        const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
        urlHostRef = match?.[1]?.toLowerCase() ?? null;
      } catch {
        urlHostRef = null;
      }

      if (urlHostRef && urlHostRef !== serviceRef.toLowerCase()) {
        checks.push({
          name: "SUPABASE_KEY_PROJECT_MATCH",
          status: "invalid",
          detail: `NEXT_PUBLIC_SUPABASE_URL host ref="${urlHostRef}" does not match service_role ref="${serviceRef}". Use the same Supabase project.`,
          required: true,
          secret: false,
        });
      } else if (snap.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ")) {
        const anonRef = decodeJwtPayload(snap.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.ref;
        if (
          typeof anonRef === "string" &&
          anonRef.toLowerCase() !== serviceRef.toLowerCase()
        ) {
          checks.push({
            name: "SUPABASE_KEY_PROJECT_MATCH",
            status: "invalid",
            detail: `Anon key project ref="${anonRef}" does not match service_role ref="${serviceRef}". Use keys from the same Supabase project.`,
            required: true,
            secret: false,
          });
        }
      }
    }
  }

  if (!snap.NEXT_PUBLIC_APP_URL) {
    checks.push({
      name: "NEXT_PUBLIC_APP_URL",
      status: "missing",
      detail:
        "Missing. Set NEXT_PUBLIC_APP_URL to your Netlify site URL (e.g. https://YOUR-SITE.netlify.app).",
      required: true,
      secret: false,
    });
  } else {
    try {
      const host = new URL(snap.NEXT_PUBLIC_APP_URL).host;
      checks.push({
        name: "NEXT_PUBLIC_APP_URL",
        status: "ok",
        detail: host,
        required: true,
        secret: false,
      });
    } catch {
      checks.push({
        name: "NEXT_PUBLIC_APP_URL",
        status: "invalid",
        detail: `Invalid URL: ${snap.NEXT_PUBLIC_APP_URL}`,
        required: true,
        secret: false,
      });
    }
  }

  if (!snap.RESEND_FROM_EMAIL) {
    checks.push({
      name: "RESEND_FROM_EMAIL",
      status: "missing",
      detail: 'Missing. Set e.g. "Nova Home Decor <onboarding@resend.dev>".',
      required: true,
      secret: false,
    });
  } else {
    checks.push({
      name: "RESEND_FROM_EMAIL",
      status: "ok",
      detail: snap.RESEND_FROM_EMAIL,
      required: true,
      secret: false,
    });
  }

  if (!snap.RESEND_API_KEY) {
    checks.push({
      name: "RESEND_API_KEY",
      status: "missing",
      detail:
        "Missing. Required for forgot-password emails. Add Secret RESEND_API_KEY (re_…).",
      required: true,
      secret: true,
    });
  } else if (!snap.RESEND_API_KEY.startsWith("re_")) {
    checks.push({
      name: "RESEND_API_KEY",
      status: "invalid",
      detail: "Resend keys usually start with re_. Check for copy/paste errors.",
      required: true,
      secret: true,
    });
  } else {
    checks.push({
      name: "RESEND_API_KEY",
      status: "ok",
      detail: "Present",
      required: true,
      secret: true,
    });
  }

  if (!snap.GEMINI_API_KEY) {
    checks.push({
      name: "GEMINI_API_KEY",
      status: "missing",
      detail: "Missing. Optional for login/forgot-password; required only for AI chat.",
      required: false,
      secret: true,
    });
  } else {
    checks.push({
      name: "GEMINI_API_KEY",
      status: "ok",
      detail: "Present",
      required: false,
      secret: true,
    });
  }

  if (!snap.SUPER_ADMIN_EMAIL) {
    checks.push({
      name: "SUPER_ADMIN_EMAIL",
      status: "missing",
      detail:
        "Missing. Set SUPER_ADMIN_EMAIL to the admin login email (e.g. your Gmail).",
      required: true,
      secret: false,
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(snap.SUPER_ADMIN_EMAIL)) {
    checks.push({
      name: "SUPER_ADMIN_EMAIL",
      status: "invalid",
      detail: `Not a valid email: ${snap.SUPER_ADMIN_EMAIL}`,
      required: true,
      secret: false,
    });
  } else {
    checks.push({
      name: "SUPER_ADMIN_EMAIL",
      status: "ok",
      detail: snap.SUPER_ADMIN_EMAIL,
      required: true,
      secret: false,
    });
  }

  return checks;
}

export function logEnvDiagnostics(prefix = "[env]"): EnvCheck[] {
  const checks = checkRequiredEnv();
  for (const check of checks) {
    const line = `${prefix} ${check.name}: ${check.status.toUpperCase()} — ${check.detail}`;
    if (check.status === "ok") console.info(line);
    else console.error(line);
  }
  return checks;
}

export function formatMissingEnvError(checks: EnvCheck[] = checkRequiredEnv()): string {
  const bad = checks.filter((c) => c.required && c.status !== "ok");
  if (bad.length === 0) return "Environment looks configured.";
  return bad.map((c) => `${c.name}: ${c.detail}`).join(" | ");
}

export function requireEnvOrThrow(
  names: string[],
): void {
  const checks = checkRequiredEnv();
  const failed = checks.filter(
    (c) => names.includes(c.name) && c.status !== "ok",
  );
  if (failed.length > 0) {
    logEnvDiagnostics("[env:require]");
    throw new Error(formatMissingEnvError(failed));
  }
}
