import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight liveness probe — no database or layout work. */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "nova-home-decor-cms" },
    { status: 200 },
  );
}
