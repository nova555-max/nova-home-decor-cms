import { createClient } from "@supabase/supabase-js";

import { env } from "@/config/env";
import { getSupabaseUrl } from "@/lib/env/supabase-public";

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

  return createClient(
    getSupabaseUrl() ?? env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
