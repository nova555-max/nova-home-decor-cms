import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const DEV_SESSION_COOKIE = "nova_dev_admin";

export function isDevAuthEnabled(): boolean {
  if (process.env.DEV_AUTH_ENABLED !== "true") return false;
  if (!process.env.DEV_ADMIN_EMAIL?.trim() || !process.env.DEV_ADMIN_PASSWORD?.trim()) {
    return false;
  }

  // Never allow cookie-based fake admin auth on Netlify / production hosts.
  if (
    process.env.NETLIFY === "true" ||
    process.env.CF_PAGES === "1" ||
    process.env.VERCEL === "1"
  ) {
    return false;
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  const onLocalhost =
    appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

  // Dev login on localhost (npm run dev or npm start locally)
  return onLocalhost || process.env.NODE_ENV === "development";
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
