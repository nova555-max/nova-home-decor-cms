export function parseFormJson<T>(
  raw: FormDataEntryValue | null,
  fallback: T,
): { ok: true; value: T } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, value: fallback };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "Invalid form data." };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, error: "Invalid form data." };
  }
}

export function logActionError(
  scope: string,
  error: unknown,
  detail?: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[cms:${scope}]`, message, detail ?? "");
}
