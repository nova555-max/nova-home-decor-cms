import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env/supabase-public";

export function createPublicClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createClient(url, anonKey);
}
