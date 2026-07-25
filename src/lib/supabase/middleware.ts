import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { withTimeout } from "@/lib/async/with-timeout";
import { hasDevSessionFromRequest } from "@/lib/auth/dev-session";
import {
  getResolvedSupabasePublicEnv,
  hasSupabasePublicEnv,
} from "@/lib/env/supabase-public";
import { withAuthCookieOptions } from "@/lib/supabase/cookie-options";

// Netlify cold starts can exceed 4s; don't abort session refresh too early.
const SESSION_TIMEOUT_MS = 10_000;
let lastSessionWarnAt = 0;
const SESSION_WARN_COOLDOWN_MS = 60_000;

function logSessionRefreshIssue(message: string): void {
  const now = Date.now();
  if (now - lastSessionWarnAt < SESSION_WARN_COOLDOWN_MS) return;
  lastSessionWarnAt = now;
  console.warn("[middleware:session]", message);
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
    );
}

/**
 * Refresh Supabase auth cookies on every matched request (SSR session bridge).
 * Also redirects unauthenticated users away from protected /admin dashboard paths.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!hasSupabasePublicEnv()) {
    return supabaseResponse;
  }

  let userId: string | null = null;
  let sessionRefreshTimedOut = false;

  try {
    const resolved = getResolvedSupabasePublicEnv();
    if (!resolved) {
      return supabaseResponse;
    }

    const supabase = createServerClient(resolved.url, resolved.anonKey, {
      cookieOptions: withAuthCookieOptions(),
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              withAuthCookieOptions(options),
            );
          });
        },
      },
    });

    // getUser() validates JWT with Auth server and refreshes cookies when needed.
    const {
      data: { user },
    } = await withTimeout(
      supabase.auth.getUser(),
      SESSION_TIMEOUT_MS,
      "Supabase session timeout",
    );
    userId = user?.id ?? null;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Supabase session refresh failed";
    sessionRefreshTimedOut = /timeout/i.test(message);
    logSessionRefreshIssue(message);
  }

  const isProtectedAdmin =
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/setup") &&
    !pathname.startsWith("/admin/forgot-password") &&
    !pathname.startsWith("/admin/reset-password") &&
    pathname !== "/admin/login";

  if (isProtectedAdmin && !userId) {
    // Dev-auth cookie is checked here; production always needs a session.
    if (!hasDevSessionFromRequest(request)) {
      // Soft-fail: if Auth was slow but cookies exist, let the RSC resolve
      // the session instead of bouncing /admin ↔ /login forever.
      if (sessionRefreshTimedOut && hasSupabaseAuthCookie(request)) {
        return supabaseResponse;
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(loginUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }
  }

  return supabaseResponse;
}
