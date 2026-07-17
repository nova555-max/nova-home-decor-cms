import { z } from "zod";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env/supabase-public";

/** Treat blank Netlify/UI env values as unset (zod `.optional()` rejects `""`). */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
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
  const supabaseUrl = emptyToUndefined(getSupabaseUrl()) as string | undefined;
  const supabaseKey = emptyToUndefined(getSupabaseAnonKey()) as
    | string
    | undefined;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
  });

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error(
      "Invalid environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in the host environment.",
    );
  }

  return parsed.data;
}

export const env = createEnv();
