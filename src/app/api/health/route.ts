import { NextRequest, NextResponse } from "next/server";

import { runProductionHealthCheck } from "@/lib/env/health";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) return false;

  const header =
    request.headers.get("x-health-secret")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  return Boolean(header && header === secret);
}

export async function GET(request: NextRequest) {
  // Public: minimal liveness only (no secrets / admin email / env dump).
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: true, service: "nova-home-decor-cms" },
      { status: 200 },
    );
  }

  const report = await runProductionHealthCheck();

  return NextResponse.json(
    {
      ok: report.ok,
      service: report.service,
      timestamp: report.timestamp,
      environment: report.environment.status,
      supabase: report.supabase.status,
      database: report.database.status,
      auth: report.auth.status,
      resend: report.resend.status,
      gemini: report.gemini.status,
      hosting: report.hosting.status,
      cloudflare: report.hosting.status,
      storage: report.storage.status,
      admin: report.admin.status,
      details: {
        environment: report.environment.detail,
        supabase: report.supabase.detail,
        database: report.database.detail,
        auth: report.auth.detail,
        resend: report.resend.detail,
        gemini: report.gemini.detail,
        hosting: report.hosting.detail,
        cloudflare: report.hosting.detail,
        storage: report.storage.detail,
        admin: report.admin.detail,
        env: report.env,
      },
    },
    { status: report.ok ? 200 : 503 },
  );
}
