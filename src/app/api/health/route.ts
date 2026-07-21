import { NextResponse } from "next/server";

import { runProductionHealthCheck } from "@/lib/env/health";

export const dynamic = "force-dynamic";

export async function GET() {
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
      // Alias kept for older dashboards / bookmarks
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
