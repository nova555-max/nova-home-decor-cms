import { RLS_DEV_HINT } from "@/lib/dev/local-mode";

export function actionErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("jwt")
  ) {
    return message + RLS_DEV_HINT;
  }
  return message;
}

export class ActionTimeoutError extends Error {
  constructor(message = "Request timed out.") {
    super(message);
    this.name = "ActionTimeoutError";
  }
}

/** Rejects if the promise does not settle within `ms` milliseconds. */
export async function withActionTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new ActionTimeoutError(message ?? `Request timed out after ${ms}ms.`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isOfficeLocationRow(
  value: unknown,
): value is {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
} {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.latitude === "number" &&
    Number.isFinite(row.latitude) &&
    typeof row.longitude === "number" &&
    Number.isFinite(row.longitude)
  );
}
