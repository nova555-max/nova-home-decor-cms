import { getGeminiApiKey } from "@/lib/ai/config";
import { STORAGE_BUCKET } from "@/lib/constants";
import { isResendConfigured } from "@/lib/email/send-password-reset";
import {
  checkRequiredEnv,
  getRuntimeEnvSnapshot,
  logEnvDiagnostics,
} from "@/lib/env/runtime";
import { classifySupabaseError } from "@/lib/env/supabase-errors";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

export type HealthStatus = "OK" | "FAIL" | "WARN";

export type HealthCheckResult = {
  status: HealthStatus;
  detail: string;
};

export type ProductionHealthReport = {
  ok: boolean;
  service: string;
  timestamp: string;
  environment: HealthCheckResult;
  supabase: HealthCheckResult;
  database: HealthCheckResult;
  auth: HealthCheckResult;
  resend: HealthCheckResult;
  gemini: HealthCheckResult;
  hosting: HealthCheckResult;
  storage: HealthCheckResult;
  admin: HealthCheckResult;
  env: {
    ok: boolean;
    checks: ReturnType<typeof checkRequiredEnv>;
  };
};

function ok(detail: string): HealthCheckResult {
  return { status: "OK", detail };
}

function fail(detail: string): HealthCheckResult {
  return { status: "FAIL", detail };
}

function warn(detail: string): HealthCheckResult {
  return { status: "WARN", detail };
}

function isCloudflareWorkersRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "caches" in globalThis &&
    typeof (globalThis as { caches?: { default?: unknown } }).caches
      ?.default !== "undefined"
  );
}

async function checkEnvironment(): Promise<HealthCheckResult> {
  const checks = checkRequiredEnv();
  const requiredBad = checks.filter((c) => c.required && c.status !== "ok");

  if (requiredBad.length === 0) {
    return ok("All required environment variables are present and valid.");
  }

  return fail(
    requiredBad.map((c) => `${c.name}: ${c.detail}`).join(" | "),
  );
}

async function checkSupabaseConnection(): Promise<HealthCheckResult> {
  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("admin_users").select("id").limit(1);

    if (error && /Invalid API key|JWT|apikey/i.test(error.message)) {
      return fail(`Anon client rejected: ${error.message}`);
    }

    if (error) {
      const kind = classifySupabaseError(error.message);
      if (kind === "dns" || kind === "network") {
        return fail(error.message);
      }
      return ok(`Connected (query note: ${error.message})`);
    }

    return ok("Supabase anon client connected.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anon client failed";
    return fail(message);
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const service = createServiceClient();
    const { error } = await service.from("admin_users").select("id").limit(1);

    if (error) {
      return fail(`Service role query failed: ${error.message}`);
    }

    return ok("service_role can query admin_users.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Service role client failed";
    return fail(message);
  }
}

async function checkAuth(): Promise<HealthCheckResult> {
  try {
    const service = createServiceClient();
    const { error } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      return fail(`Auth admin API failed: ${error.message}`);
    }

    return ok("Supabase Auth admin API reachable.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth check failed";
    return fail(message);
  }
}

async function checkResend(): Promise<HealthCheckResult> {
  if (!isResendConfigured()) {
    return fail("RESEND_API_KEY is not configured.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return fail("RESEND_API_KEY is empty.");
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.status === 401 || response.status === 403) {
      const body = await response.text().catch(() => "");
      return fail(
        `Resend rejected API key (${response.status}). ${body.slice(0, 160)}`,
      );
    }

    if (!response.ok) {
      return fail(`Resend API returned ${response.status}`);
    }

    return ok("RESEND_API_KEY accepted by Resend API.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend request failed";
    return fail(message);
  }
}

async function checkGemini(): Promise<HealthCheckResult> {
  const key = getGeminiApiKey();
  if (!key) {
    return warn(
      "GEMINI_API_KEY is not configured. AI chat is disabled; login/forgot-password still work.",
    );
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET" },
    );

    if (response.status === 400 || response.status === 403) {
      const body = await response.text().catch(() => "");
      return fail(
        `Gemini rejected API key (${response.status}). ${body.slice(0, 160)}`,
      );
    }

    if (!response.ok) {
      return fail(`Gemini API returned ${response.status}`);
    }

    return ok("GEMINI_API_KEY accepted.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed";
    return fail(message);
  }
}

async function checkHosting(): Promise<HealthCheckResult> {
  const snap = getRuntimeEnvSnapshot();
  const appUrl = snap.NEXT_PUBLIC_APP_URL ?? "missing";
  const onWorkers = isCloudflareWorkersRuntime();
  const isNetlify =
    !!process.env.NETLIFY ||
    !!process.env.NETLIFY_DEV ||
    appUrl.includes("netlify.app");

  if (isNetlify) {
    return ok(`Netlify host detected. APP_URL=${appUrl}`);
  }

  if (onWorkers) {
    return warn(
      `Cloudflare Workers runtime detected (legacy). Prefer Netlify. APP_URL=${appUrl}`,
    );
  }

  return ok(`Local/Node runtime. APP_URL=${appUrl}`);
}

async function checkStorage(): Promise<HealthCheckResult> {
  try {
    const service = createServiceClient();
    const { error } = await service.storage.from(STORAGE_BUCKET).list("", {
      limit: 1,
    });

    if (error) {
      return fail(`Storage bucket "${STORAGE_BUCKET}": ${error.message}`);
    }

    return ok(`Storage bucket "${STORAGE_BUCKET}" is reachable.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Storage check failed";
    return fail(message);
  }
}

async function checkAdmin(): Promise<HealthCheckResult> {
  const snap = getRuntimeEnvSnapshot();
  const email = snap.SUPER_ADMIN_EMAIL;

  if (!email) {
    return fail("SUPER_ADMIN_EMAIL is not set.");
  }

  try {
    const service = createServiceClient();

    const { data: profile, error: profileError } = await service
      .from("admin_users")
      .select("id, email, role, is_active, auth_user_id")
      .ilike("email", email)
      .maybeSingle();

    if (profileError) {
      return fail(`admin_users lookup failed: ${profileError.message}`);
    }

    if (!profile) {
      return fail(
        `No admin_users row for ${email}. Create admin at /admin/setup or insert the profile.`,
      );
    }

    if (!profile.is_active) {
      return fail(`Admin ${email} exists but is_active=false.`);
    }

    let authExists = false;
    if (profile.auth_user_id) {
      const { data, error } = await service.auth.admin.getUserById(
        profile.auth_user_id as string,
      );
      authExists = !error && !!data?.user;
    }

    if (!authExists) {
      for (let page = 1; page <= 5; page += 1) {
        const { data, error } = await service.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) {
          return fail(`Auth user lookup failed: ${error.message}`);
        }
        const found = data.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        if (found) {
          authExists = true;
          break;
        }
        if (data.users.length < 200) break;
      }
    }

    if (!authExists) {
      return fail(
        `SUPER_ADMIN_EMAIL ${email} is not in Supabase Auth users. Create via /admin/setup.`,
      );
    }

    return ok(
      `Admin ${email} found in admin_users + Auth (role=${profile.role}).`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Admin check failed";
    return fail(message);
  }
}

function isCritical(check: HealthCheckResult): boolean {
  return check.status === "FAIL";
}

export async function runProductionHealthCheck(): Promise<ProductionHealthReport> {
  logEnvDiagnostics("[health:startup]");

  const envChecks = checkRequiredEnv();
  const envOk = envChecks.every((c) => !c.required || c.status === "ok");

  const [
    environment,
    supabase,
    database,
    auth,
    resend,
    gemini,
    hosting,
    storage,
    admin,
  ] = await Promise.all([
    checkEnvironment(),
    checkSupabaseConnection(),
    checkDatabase(),
    checkAuth(),
    checkResend(),
    checkGemini(),
    checkHosting(),
    checkStorage(),
    checkAdmin(),
  ]);

  const critical = [
    environment,
    supabase,
    database,
    auth,
    resend,
    storage,
    admin,
  ];

  const ok =
    envOk && critical.every((check) => !isCritical(check));

  return {
    ok,
    service: "nova-home-decor-cms",
    timestamp: new Date().toISOString(),
    environment,
    supabase,
    database,
    auth,
    resend,
    gemini,
    hosting,
    storage,
    admin,
    env: {
      ok: envOk,
      checks: envChecks.map((c) => ({
        ...c,
        detail: c.secret && c.status === "ok" ? "Present" : c.detail,
      })),
    },
  };
}
