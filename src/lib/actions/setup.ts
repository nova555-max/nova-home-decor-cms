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

async function findAuthUserIdByEmail(
  service: ReturnType<typeof createServiceClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error("[createFirstAdministrator] listUsers", error.message);
      return null;
    }
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * First-install only: create the single lifetime administrator.
 * Permanently rejected once any super_admin row exists.
 * If Auth user already exists (partial prior install), links/updates it.
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
      error:
        "Could not verify administrator status. Check SUPABASE_SERVICE_ROLE_KEY (sb_secret_… or service_role JWT) matches NEXT_PUBLIC_SUPABASE_URL, then redeploy.",
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
        "Add SUPABASE_SERVICE_ROLE_KEY in Netlify → Site configuration → Environment variables, then redeploy. " +
        "Copy secret key (sb_secret_…) or legacy service_role JWT from Supabase → Settings → API (not the anon key). " +
        "Must be from the same project as NEXT_PUBLIC_SUPABASE_URL (zfsoeketfjnnpirglosq).",
    };
  }

  // Re-check immediately before create (race safety).
  if (await hasAdministrator()) {
    return {
      success: false,
      error: "Administrator already exists. This page is permanently disabled.",
    };
  }

  let authUserId: string | null = null;

  const { data: authData, error: authError } =
    await service.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const already =
      authError &&
      /already.*(registered|exists)|duplicate|User already/i.test(
        authError.message,
      );

    if (already) {
      authUserId = await findAuthUserIdByEmail(service, normalized);
      if (!authUserId) {
        return {
          success: false,
          error:
            "Auth user already exists but could not be loaded. Open Supabase → Authentication → Users and confirm the email, then retry.",
        };
      }
      const { error: updateError } = await service.auth.admin.updateUserById(
        authUserId,
        { password, email_confirm: true },
      );
      if (updateError) {
        return {
          success: false,
          error: `Could not update existing auth user password: ${updateError.message}`,
        };
      }
    } else {
      console.error(
        "[createFirstAdministrator] auth",
        authError?.message ?? "no user",
      );
      return {
        success: false,
        error: authError?.message ?? "Could not create auth user.",
      };
    }
  } else {
    authUserId = authData.user.id;
  }

  if (!authUserId) {
    return { success: false, error: "Could not resolve auth user id." };
  }

  const { error: profileError } = await service.from("admin_users").insert({
    auth_user_id: authUserId,
    email: normalized,
    role: "super_admin",
    permissions: permissionsForRole("super_admin"),
    is_active: true,
  });

  if (profileError) {
    console.error("[createFirstAdministrator] profile", profileError.message);
    // Do not delete a pre-existing auth user we only updated.
    if (authData.user) {
      await service.auth.admin.deleteUser(authUserId);
    }
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
    return {
      success: false,
      error: `Could not create administrator profile: ${profileError.message}`,
    };
  }

  return { success: true };
}
