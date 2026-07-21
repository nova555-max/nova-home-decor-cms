import { z } from "zod";

/** Treat blank Netlify/UI env values as unset (zod `.optional()` rejects `""`). */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:3000"),
  ),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.preprocess(
    emptyToUndefined,
    z.enum(["ku", "ar", "en"]).default("ku"),
  ),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  SUPER_ADMIN_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().optional(),
  ),
});

function createEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.error("[env] Invalid environment variables:", fieldErrors);

    // Never crash the app at import time — use safe defaults and log.
    return {
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
      NEXT_PUBLIC_DEFAULT_LOCALE:
        (process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim() as
          | "ku"
          | "ar"
          | "en"
          | undefined) || "ku",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined,
      SUPER_ADMIN_EMAIL:
        process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || undefined,
    };
  }

  return parsed.data;
}

export const env = createEnv();
