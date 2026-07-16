"use server";

import { createCmsClient } from "@/lib/supabase/cms-client";
import { getAdminContext } from "@/lib/queries/admin-users";

type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const ctx = await getAdminContext();
    const supabase = await createCmsClient();
    await supabase.from("audit_logs").insert({
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      actor_email: ctx?.email ?? null,
      details: input.details ?? {},
    });
  } catch {
    // Audit logging must not break primary flows
  }
}
