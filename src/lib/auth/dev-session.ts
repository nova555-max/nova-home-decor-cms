import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const DEV_SESSION_COOKIE = "nova_dev_admin";

function isCloudflareWorkersRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "caches" in globalThis &&
    typeof (globalThis as { caches?: { default?: unknown } }).caches
      ?.default !== "undefined"
  );
}

/**
 * Cookie-based fake admin auth — localhost only.
 * Never enable on Netlify / Vercel / Cloudflare / any public host.
 */
export function isDevAuthEnabled(): boolean {
  if (process.env.DEV_AUTH_ENABLED !== "true") return false;
  if (!process.env.DEV_ADMIN_EMAIL?.trim() || !process.env.DEV_ADMIN_PASSWORD?.trim()) {
    return false;
  }

  if (
    process.env.NETLIFY === "true" ||
    process.env.CF_PAGES === "1" ||
    process.env.VERCEL === "1" ||
    process.env.WORKERS_CI === "1" ||
    isCloudflareWorkersRuntime()
  ) {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  const onLocalhost =
    !appUrl ||
    appUrl.includes("localhost") ||
    appUrl.includes("127.0.0.1");

  return onLocalhost && process.env.NODE_ENV === "development";
}

export function validateDevCredentials(
  email: string,
  password: string,
): boolean {
  if (!isDevAuthEnabled()) return false;

  return (
    email.toLowerCase() === process.env.DEV_ADMIN_EMAIL!.toLowerCase() &&
    password === process.env.DEV_ADMIN_PASSWORD!.replace(/^["']|["']$/g, "")
  );
}

export async function createDevSession(): Promise<void> {
  if (!isDevAuthEnabled()) return;
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearDevSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SESSION_COOKIE);
}

export async function hasDevSession(): Promise<boolean> {
  if (!isDevAuthEnabled()) return false;
  const cookieStore = await cookies();
  return cookieStore.get(DEV_SESSION_COOKIE)?.value === "1";
}

export function hasDevSessionFromRequest(request: NextRequest): boolean {
  if (!isDevAuthEnabled()) return false;
  return request.cookies.get(DEV_SESSION_COOKIE)?.value === "1";
}
