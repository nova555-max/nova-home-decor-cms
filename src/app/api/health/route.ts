import { NextResponse } from "next/server";

import { getGeminiApiKey } from "@/lib/ai/config";
import { isResendConfigured } from "@/lib/email/send-password-reset";
import {
  checkRequiredEnv,
  getRuntimeEnvSnapshot,
  logEnvDiagnostics,
} from "@/lib/env/runtime";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type ServiceStatus = {
  ok: boolean;
  detail: string;
};

async function checkSupabaseAnon(): Promise<ServiceStatus> {
  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from("admin_users").select("id").limit(1);
    // RLS may block rows for anon — connection success matters more than rows.
    if (error && /Invalid API key|JWT|apikey/i.test(error.message)) {
      return { ok: false, detail: `Anon client failed: ${error.message}` };
    }
    return {
      ok: true,
      detail: error
        ? `Connected (query note: ${error.message})`
        : "Connected with anon/publishable key",
    };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Anon client failed",
    };
  }
}

async function checkServiceRole(): Promise<ServiceStatus> {
  try {
    const service = createServiceClient();
    const { error } = await service.from("admin_users").select("id").limit(1);
    if (error) {
      return { ok: false, detail: `Service role query failed: ${error.message}` };
    }
    return { ok: true, detail: "service_role can query admin_users" };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Service role client failed",
    };
  }
}

async function checkAdminAccount(): Promise<ServiceStatus> {
  const snap = getRuntimeEnvSnapshot();
  const email = snap.SUPER_ADMIN_EMAIL;
  if (!email) {
    return { ok: false, detail: "SUPER_ADMIN_EMAIL is not set" };
  }

  try {
    const service = createServiceClient();

    const { data: profile, error: profileError } = await service
      .from("admin_users")
      .select("id, email, role, is_active, auth_user_id")
      .ilike("email", email)
      .maybeSingle();

    if (profileError) {
      return {
        ok: false,
        detail: `admin_users lookup failed: ${profileError.message}`,
      };
    }

    if (!profile) {
      return {
        ok: false,
        detail: `No admin_users row for ${email}. Create admin at /admin/setup or insert the profile.`,
      };
    }

    if (!profile.is_active) {
      return { ok: false, detail: `Admin ${email} exists but is_active=false` };
    }

    let authExists = false;
    if (profile.auth_user_id) {
      const { data, error } = await service.auth.admin.getUserById(
        profile.auth_user_id as string,
      );
      authExists = !error && !!data?.user;
    }

    if (!authExists) {
      // Fallback: scan auth users for email
      for (let page = 1; page <= 5; page += 1) {
        const { data, error } = await service.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) {
          return {
            ok: false,
            detail: `Auth user lookup failed: ${error.message}`,
          };
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
      return {
        ok: false,
        detail: `SUPER_ADMIN_EMAIL ${email} is not in Supabase Auth users. Create the user via /admin/setup or Auth dashboard.`,
      };
    }

    return {
      ok: true,
      detail: `Admin ${email} found in admin_users + Auth (role=${profile.role})`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Admin check failed",
    };
  }
}

async function checkResend(): Promise<ServiceStatus> {
  if (!isResendConfigured()) {
    return { ok: false, detail: "RESEND_API_KEY is not configured" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, detail: "RESEND_API_KEY is not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.status === 401 || response.status === 403) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        detail: `Resend rejected API key (${response.status}). ${body.slice(0, 160)}`,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        detail: `Resend API returned ${response.status}`,
      };
    }

    return { ok: true, detail: "RESEND_API_KEY accepted by Resend API" };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Resend request failed",
    };
  }
}

async function checkGemini(): Promise<ServiceStatus> {
  const key = getGeminiApiKey();
  if (!key) {
    return { ok: false, detail: "GEMINI_API_KEY is not configured" };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET" },
    );

    if (response.status === 400 || response.status === 403) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        detail: `Gemini rejected API key (${response.status}). ${body.slice(0, 160)}`,
      };
    }

    if (!response.ok) {
      return { ok: false, detail: `Gemini API returned ${response.status}` };
    }

    return { ok: true, detail: "GEMINI_API_KEY accepted" };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "Gemini request failed",
    };
  }
}

export async function GET() {
  const envChecks = logEnvDiagnostics("[health]");
  const envOk = envChecks.every((c) => !c.required || c.status === "ok");

  const [supabase, serviceRole, resend, gemini, admin] = await Promise.all([
    checkSupabaseAnon(),
    checkServiceRole(),
    checkResend(),
    checkGemini(),
    checkAdminAccount(),
  ]);

  const services = {
    env: {
      ok: envOk,
      detail: envOk
        ? "All required env vars present"
        : envChecks
            .filter((c) => c.status !== "ok")
            .map((c) => `${c.name}: ${c.detail}`)
            .join(" | "),
      checks: envChecks.map((c) => ({
        name: c.name,
        status: c.status,
        detail: c.secret && c.status === "ok" ? "Present" : c.detail,
      })),
    },
    supabase,
    serviceRole,
    resend,
    gemini,
    admin,
  };

  const ok =
    services.env.ok &&
    services.supabase.ok &&
    services.serviceRole.ok &&
    services.resend.ok &&
    services.admin.ok;
  // Gemini is optional for auth; reported but does not fail overall health.

  return NextResponse.json(
    {
      ok,
      service: "nova-home-decor-cms",
      timestamp: new Date().toISOString(),
      services,
    },
    { status: ok ? 200 : 503 },
  );
}
