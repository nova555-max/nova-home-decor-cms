import { STORAGE_BUCKET } from "@/lib/constants";
import { getSupabaseUrl } from "@/lib/env/supabase-public";

/** URLs that must not be stored in Supabase settings or media tables. */
export function isInvalidPersistedMediaUrl(
  url: string | null | undefined,
): boolean {
  if (!url?.trim()) return false;

  const value = url.trim();
  const lower = value.toLowerCase();

  if (lower.startsWith("blob:")) return true;
  if (lower.startsWith("data:")) return true;
  if (lower.startsWith("/")) return true;
  if (lower.includes("/api/dev-uploads")) return true;
  if (lower.includes("localhost")) return true;
  if (lower.includes("127.0.0.1")) return true;
  if (!lower.startsWith("https://")) return true;

  return false;
}

export function isSupabaseStoragePublicUrl(url: string): boolean {
  const base = getSupabaseUrl()?.replace(/\/$/, "");
  if (!base) return false;

  const expectedPrefix = `${base}/storage/v1/object/public/${STORAGE_BUCKET}/`;
  return url.startsWith(expectedPrefix);
}

export function assertPersistableMediaUrl(
  url: string,
  label = "Image URL",
): string | null {
  if (isInvalidPersistedMediaUrl(url)) {
    return `${label} must be a public HTTPS Supabase Storage URL. Upload again from the admin panel.`;
  }
  if (!isSupabaseStoragePublicUrl(url)) {
    return `${label} must be uploaded to Supabase Storage (${STORAGE_BUCKET} bucket).`;
  }
  return null;
}

export function findInvalidPersistedMediaUrls(
  entries: { url: string | null | undefined; label: string }[],
): string | null {
  for (const { url, label } of entries) {
    if (!url?.trim()) continue;
    const error = assertPersistableMediaUrl(url, label);
    if (error) return error;
  }
  return null;
}
