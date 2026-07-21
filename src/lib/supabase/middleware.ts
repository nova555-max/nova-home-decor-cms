import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  getResolvedSupabasePublicEnv,
  hasSupabasePublicEnv,
} from "@/lib/env/supabase-public";

const SESSION_TIMEOUT_MS = 4000;
let lastSessionWarnAt = 0;
const SESSION_WARN_COOLDOWN_MS = 60_000;

function logSessionRefreshIssue(message: string): void {
  const now = Date.now();
  if (now - lastSessionWarnAt < SESSION_WARN_COOLDOWN_MS) return;
  lastSessionWarnAt = now;
  console.warn("[middleware:session]", message);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Supabase session timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Refresh Supabase cookies and forward pathname.
 *
 * Edge Runtime notes:
 * - Only imports Edge-compatible modules (next/server, @supabase/ssr, env helpers).
 * - @supabase/supabase-js >= 2.110.5 avoids static `process.version` access
 *   (uses globalThis['process']) so Next.js Edge analysis stays clean.
 * - Auth redirects stay in Server Components to avoid breaking RSC fetches.
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

  try {
    const resolved = getResolvedSupabasePublicEnv();
    if (!resolved) {
      return supabaseResponse;
    }

    const supabase = createServerClient(
      resolved.url,
      resolved.anonKey,
      {
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
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    await withTimeout(supabase.auth.getUser(), SESSION_TIMEOUT_MS);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Supabase session refresh failed";
    logSessionRefreshIssue(message);
  }

  return supabaseResponse;
}
