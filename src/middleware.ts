import { type NextRequest, NextResponse } from "next/server";

import { CONTENT_SECURITY_POLICY } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/middleware";

function withSecurityHeaders(response: NextResponse): NextResponse {
  // Always set an explicit CSP that allows Maps/Next eval usage.
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
