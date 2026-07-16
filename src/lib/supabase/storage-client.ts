import { createServiceClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { createCmsClient } from "@/lib/supabase/cms-client";

/** Server-only client for Storage writes — prefers service role when configured. */
export async function createStorageWriteClient() {
  if (getServiceRoleKey()) {
    return createServiceClient();
  }
  return createCmsClient();
}
