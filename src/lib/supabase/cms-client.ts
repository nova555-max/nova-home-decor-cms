import { hasDevSession } from "@/lib/auth/dev-session";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Supabase client for CMS writes — uses service role when available (required for dev login). */
export async function createCmsClient() {
  const serviceKey = getServiceRoleKey();
  if (process.env.QA_STANDALONE === "1" && serviceKey) {
    return createServiceClient();
  }

  if (await hasDevSession()) {
    const serviceKey = getServiceRoleKey();
    if (serviceKey) {
      if (process.env.NODE_ENV === "development") {
        console.info("[cms-client] using service role (dev session)");
      }
      return createServiceClient();
    }
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[cms-client] dev session without SUPABASE_SERVICE_ROLE_KEY — writes may fail RLS",
      );
    }
  }
  return createClient();
}
