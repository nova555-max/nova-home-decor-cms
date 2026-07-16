/** Max wait for startup Supabase reads — prevents hung requests from blocking the dev server. */
export const STARTUP_QUERY_TIMEOUT_MS = 8_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label ?? "Operation"} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label?: string,
): Promise<T> {
  try {
    return await withTimeout(promise, ms, label);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message =
        error instanceof Error ? error.message : "Operation timed out";
      console.warn(`[startup-timeout] ${label ?? "query"}: ${message}`);
    }
    return fallback;
  }
}
