"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { env } from "@/config/env";
import { normalizePermissions } from "@/lib/auth/permissions";
import { getAdminUserByEmail } from "@/lib/queries/admin-users";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/supabase/auth";
import type { AdminPermissions } from "@/types/admin";
import { ADMIN_MODULES } from "@/types/admin";

type ActionResult = { success: true } | { success: false; error: string };

function parsePermissions(formData: FormData): AdminPermissions {
  return ADMIN_MODULES.reduce((acc, module) => {
    acc[module] = formData.get(`perm_${module}`) === "on";
    return acc;
  }, {} as AdminPermissions);
}

export async function createEditor(formData: FormData): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  if (env.SUPER_ADMIN_EMAIL && email === env.SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: "This email is reserved for the administrator account.",
    };
  }

  const existing = await getAdminUserByEmail(email);
  if (existing) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  const permissions = normalizePermissions(parsePermissions(formData));
  if (!Object.values(permissions).some(Boolean)) {
    return { success: false, error: "Select at least one permission." };
  }

  try {
    const service = createServiceClient();

    const { data: authData, error: authError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message ?? "Could not create auth user.",
      };
    }

    // Employees are always editors — never super_admin.
    const { error: profileError } = await service.from("admin_users").insert({
      auth_user_id: authData.user.id,
      email,
      role: "editor",
      permissions,
      is_active: true,
      created_by: admin.profileId === "dev-admin" ? null : admin.profileId,
    });

    if (profileError) {
      await service.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message };
    }

    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not create editor.",
    };
  }
}

export async function updateEditor(formData: FormData): Promise<ActionResult> {
  await requireSuperAdmin();

  const id = formData.get("id") as string;
  const password = (formData.get("password") as string)?.trim();
  const isActive = formData.get("is_active") === "true";
  const permissions = normalizePermissions(parsePermissions(formData));

  if (!id) {
    return { success: false, error: "Editor id is required." };
  }

  if (isActive && !Object.values(permissions).some(Boolean)) {
    return { success: false, error: "Select at least one permission." };
  }

  try {
    const service = createServiceClient();

    const { data: editor, error: fetchError } = await service
      .from("admin_users")
      .select("auth_user_id, role")
      .eq("id", id)
      .single();

    if (fetchError || !editor || editor.role !== "editor") {
      return { success: false, error: "Editor not found." };
    }

    // Never promote employees to administrator.
    const { error: updateError } = await service
      .from("admin_users")
      .update({ permissions, is_active: isActive, role: "editor" })
      .eq("id", id)
      .eq("role", "editor");

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (password && editor.auth_user_id) {
      if (password.length < 8) {
        return {
          success: false,
          error: "Password must be at least 8 characters.",
        };
      }
      const { error: passwordError } = await service.auth.admin.updateUserById(
        editor.auth_user_id,
        { password },
      );
      if (passwordError) {
        return { success: false, error: passwordError.message };
      }
    }

    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not update editor.",
    };
  }
}

export async function deleteEditor(id: string): Promise<ActionResult> {
  await requireSuperAdmin();

  if (!id) {
    return { success: false, error: "Editor id is required." };
  }

  try {
    const service = createServiceClient();

    const { data: editor, error: fetchError } = await service
      .from("admin_users")
      .select("auth_user_id, role")
      .eq("id", id)
      .single();

    if (fetchError || !editor || editor.role !== "editor") {
      return { success: false, error: "Editor not found." };
    }

    const { error: deleteProfileError } = await service
      .from("admin_users")
      .delete()
      .eq("id", id);

    if (deleteProfileError) {
      return { success: false, error: deleteProfileError.message };
    }

    if (editor.auth_user_id) {
      await service.auth.admin.deleteUser(editor.auth_user_id);
    }

    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not delete editor.",
    };
  }
}
