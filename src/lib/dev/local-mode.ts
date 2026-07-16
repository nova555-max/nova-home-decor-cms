import { findInvalidPersistedMediaUrls } from "@/lib/media/storage-url";

/** True only when Supabase is not configured (placeholder URL). */
export function isLocalDevCms(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_ENABLED === "true" &&
    (url.includes("your-project") || url.includes("placeholder"))
  );
}

/** Dev hint when RLS blocks writes without service role. */
export function needsServiceRoleForWrites(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_ENABLED === "true" &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    !isLocalDevCms()
  );
}

export const RLS_DEV_HINT =
  " Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API → service_role) and restart the dev server.";

export const SERVICE_ROLE_REQUIRED_MSG =
  "Settings could not be saved to Supabase. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart.";

export const UPLOAD_SERVICE_ROLE_REQUIRED_MSG =
  "Image upload requires Supabase access. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart.";

const LOCAL_UPLOAD_PREFIX = "/api/dev-uploads/";

/** Dev-only upload paths must not be persisted when using a real Supabase project. */
export function isLocalDevUploadUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(LOCAL_UPLOAD_PREFIX) || url.includes("/api/dev-uploads/");
}

/** @deprecated Use findInvalidPersistedMediaUrls from @/lib/media/storage-url */
export function findInvalidSupabaseMediaUrls(
  urls: (string | null | undefined)[],
): string | null {
  if (isLocalDevCms()) return null;
  return findInvalidPersistedMediaUrls(
    urls
      .filter((url): url is string => !!url?.trim())
      .map((url) => ({ url, label: "Image" })),
  );
}
