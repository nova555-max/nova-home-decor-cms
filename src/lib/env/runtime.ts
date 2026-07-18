/**
 * Runtime environment diagnostics for Cloudflare Workers / local / Docker.
 * Never throws at import time — call explicitly from health checks and auth flows.
 */

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
  if (!key.startsWith("eyJ")) return false;
  const payload = decodeJwtPayload(key);
  return payload?.role === "service_role";
}

export function getRuntimeEnvSnapshot() {
  const supabaseUrlRaw = trimEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseUrl = supabaseUrlRaw
    ? normalizeSupabaseUrl(supabaseUrlRaw)
    : undefined;

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      trimEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
      trimEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_APP_URL: trimEnv("NEXT_PUBLIC_APP_URL"),
    NEXT_PUBLIC_DEFAULT_LOCALE: trimEnv("NEXT_PUBLIC_DEFAULT_LOCALE") || "ku",
    SUPABASE_SERVICE_ROLE_KEY: trimEnv("SUPABASE_SERVICE_ROLE_KEY"),
    RESEND_API_KEY: trimEnv("RESEND_API_KEY"),
    RESEND_FROM_EMAIL:
      trimEnv("RESEND_FROM_EMAIL") ||
      "Nova Home Decor <onboarding@resend.dev>",
    GEMINI_API_KEY: trimEnv("GEMINI_API_KEY"),
    SUPER_ADMIN_EMAIL: trimEnv("SUPER_ADMIN_EMAIL")?.toLowerCase(),
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
        "Missing. Set in Cloudflare → Variables and Secrets (and Build variables for client bundle).",
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
    checks.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      status: "ok",
      detail: snap.NEXT_PUBLIC_SUPABASE_URL,
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
        "Missing. Cloudflare → Variables and Secrets → Add Secret. Copy service_role from Supabase → Settings → API (not the anon key).",
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
        : "Value is not a valid service_role JWT (must start with eyJ and decode to role=service_role).",
      required: true,
      secret: true,
    });
  } else {
    checks.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      status: "ok",
      detail: "Present (service_role JWT)",
      required: true,
      secret: true,
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
      detail: "Missing. Required for AI chat. Add Secret GEMINI_API_KEY.",
      required: true,
      secret: true,
    });
  } else {
    checks.push({
      name: "GEMINI_API_KEY",
      status: "ok",
      detail: "Present",
      required: true,
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
