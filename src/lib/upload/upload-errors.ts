export function isAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("jwt") ||
    lower.includes("session") ||
    lower.includes("not authenticated") ||
    lower.includes("auth session missing") ||
    lower.includes("invalid claim")
  );
}

export function isRetryableUploadError(message: string): boolean {
  const lower = message.toLowerCase();
  if (isAuthError(lower)) return true;
  if (
    lower.includes("invalid form") ||
    lower.includes("no file") ||
    lower.includes("invalid image") ||
    lower.includes("file too large") ||
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("service role")
  ) {
    return false;
  }
  return (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout") ||
    lower.includes("failed to fetch") ||
    lower.includes("storage") ||
    lower.includes("upload") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("504")
  );
}
