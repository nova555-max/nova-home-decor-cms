import { createServiceClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase client for authenticated CMS writes.
 * Prefer service role whenever configured — migration 008 revoked
 * EXECUTE on is_active_admin() from authenticated, so session-client
 * updates fail with "permission denied for function is_active_admin".
 * Callers must still gate with requireAdmin / requirePermission.
 */
export async function createCmsClient() {
  if (getServiceRoleKey()) {
    return createServiceClient();
  }
  return createClient();
}
