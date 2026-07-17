import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env/supabase-public";

export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function createServiceClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to manage editor accounts.",
    );
  }

  const { url } = requireSupabasePublicEnv();

  return createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
