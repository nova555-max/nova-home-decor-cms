/**
 * Allow only same-origin relative paths (blocks //evil.com open redirects).
 */
export function safeInternalPath(
  next: string | null | undefined,
  fallback = "/admin",
): string {
  if (!next) return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.startsWith("/\\")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;

  // Decode once to catch encoded // and backslash tricks.
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) return fallback;
  if (decoded.includes("://")) return fallback;

  return trimmed;
}
