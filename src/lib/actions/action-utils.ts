import { RLS_DEV_HINT } from "@/lib/dev/local-mode";

export function actionErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("products_slug_key") ||
    lower.includes("duplicate key") && lower.includes("slug")
  ) {
    return "A product with this slug already exists. The system will assign a unique slug automatically — please try saving again.";
  }

  if (
    lower.includes("bucket not found") ||
    lower.includes("does not exist") && lower.includes("bucket")
  ) {
    return (
      "Storage bucket `cms-uploads` was not found. Create it in Supabase Storage (public) " +
      "or run the project migrations, then retry the upload."
    );
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("jwt")
  ) {
    const onNetlify =
      process.env.NETLIFY === "true" || process.env.NODE_ENV === "production";
    if (onNetlify) {
      return (
        message +
        " Fix: set SUPABASE_SERVICE_ROLE_KEY in Netlify (same project as NEXT_PUBLIC_SUPABASE_URL), enable Builds + Functions, then redeploy."
      );
    }
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
