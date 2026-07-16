export type SafeFetchResult<T = Response> =
  { ok: true; response: T } | { ok: false; error: string };

export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<SafeFetchResult> {
  const { timeoutMs = 5000, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    });
    return { ok: true, response };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeHeadOk(
  url: string,
  timeoutMs = 4000,
): Promise<boolean> {
  const result = await safeFetch(url, {
    method: "HEAD",
    cache: "no-store",
    timeoutMs,
  });
  if (!result.ok) return false;
  return result.response.ok;
}
