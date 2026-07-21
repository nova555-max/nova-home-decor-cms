import type { CookieOptions } from "@supabase/ssr";

/**
 * Netlify + browsers require Secure cookies on HTTPS.
 * Without this, Server Action sessions from signInWithPassword often fail to stick.
 */
export function withAuthCookieOptions(
  options?: CookieOptions,
): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    ...(options ?? {}),
    path: options?.path ?? "/",
    sameSite: (options?.sameSite as CookieOptions["sameSite"]) ?? "lax",
    secure: options?.secure ?? isProd,
  };
}
