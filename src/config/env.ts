import { z } from "zod";

import { resolvePublicEnvWithDefaults } from "@/config/public-env-defaults";

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
  const pub = resolvePublicEnvWithDefaults();

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: pub.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: pub.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    SUPER_ADMIN_EMAIL: pub.SUPER_ADMIN_EMAIL,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.error("[env] Invalid environment variables:", fieldErrors);

    return {
      NEXT_PUBLIC_APP_URL: pub.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_DEFAULT_LOCALE: pub.NEXT_PUBLIC_DEFAULT_LOCALE as
        | "ku"
        | "ar"
        | "en",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined,
      SUPER_ADMIN_EMAIL: pub.SUPER_ADMIN_EMAIL.toLowerCase(),
    };
  }

  return parsed.data;
}

export const env = createEnv();
