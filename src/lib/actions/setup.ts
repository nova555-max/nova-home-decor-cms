"use server";

import { permissionsForRole } from "@/lib/auth/permissions";
import {
  countAdministrators,
  hasAdministrator,
} from "@/lib/queries/admin-users";
import { createServiceClient } from "@/lib/supabase/admin";

type ActionResult = { success: true } | { success: false; error: string };

export type AdministratorRegistrationStatus =
  | { canRegister: true }
  | { canRegister: false; supportEmail: string | null };

export async function getAdministratorRegistrationStatus(): Promise<AdministratorRegistrationStatus> {
  try {
    if (await hasAdministrator()) {
      return {
        canRegister: false,
        supportEmail: process.env.SUPER_ADMIN_EMAIL?.trim() || null,
      };
    }
    return { canRegister: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getAdministratorRegistrationStatus]", message);
    // If service role is broken, still allow opening setup so the user sees a clear error.
    return { canRegister: true };
  }
}

/**
 * First-install only: create the single lifetime administrator.
 * Permanently rejected once any super_admin row exists.
 */
export async function createFirstAdministrator(
  email: string,
  password: string,
  confirmPassword: string,
): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return { success: false, error: "Email is required." };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  let adminCount: number;
  try {
    adminCount = await countAdministrators();
  } catch (err) {
    console.error(
      "[createFirstAdministrator] count",
      err instanceof Error ? err.message : err,
    );
    return {
      success: false,
      error: "Could not verify administrator status.",
    };
  }

  if (adminCount >= 1) {
    return {
      success: false,
      error: "Administrator already exists. This page is permanently disabled.",
    };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Service role key missing.";
    console.error("[createFirstAdministrator]", message);
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY in Cloudflare → Variables and Secrets (Secret), then Save/Deploy. " +
        "Copy service_role from Supabase → Settings → API (not the anon key).",
    };
  }

  // Re-check immediately before create (race safety).
  if (await hasAdministrator()) {
    return {
      success: false,
      error: "Administrator already exists. This page is permanently disabled.",
    };
  }

  const { data: authData, error: authError } =
    await service.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    console.error(
      "[createFirstAdministrator] auth",
      authError?.message ?? "no user",
    );
    return {
      success: false,
      error: authError?.message ?? "Could not create auth user.",
    };
  }

  const authUserId = authData.user.id;

  const { error: profileError } = await service.from("admin_users").insert({
    auth_user_id: authUserId,
    email: normalized,
    role: "super_admin",
    permissions: permissionsForRole("super_admin"),
    is_active: true,
  });

  if (profileError) {
    console.error("[createFirstAdministrator] profile", profileError.message);
    await service.auth.admin.deleteUser(authUserId);
    if (
      /one administrator|idx_one_super_admin|duplicate|unique/i.test(
        profileError.message,
      )
    ) {
      return {
        success: false,
        error:
          "Administrator already exists. This page is permanently disabled.",
      };
    }
    return { success: false, error: "Could not create administrator profile." };
  }

  return { success: true };
}
