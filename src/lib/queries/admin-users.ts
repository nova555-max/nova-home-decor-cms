import { env } from "@/config/env";
import { hasDevSession } from "@/lib/auth/dev-session";
import {
  ALL_ADMIN_PERMISSIONS,
  normalizePermissions,
  permissionsForRole,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { AdminContext, AdminUser } from "@/types/admin";

function devAdminContext(): AdminContext {
  return {
    userId: "dev-admin",
    email:
      process.env.DEV_ADMIN_EMAIL ??
      env.SUPER_ADMIN_EMAIL ??
      "admin@novahomedecor.com",
    role: "super_admin",
    permissions: ALL_ADMIN_PERMISSIONS,
    profileId: "dev-admin",
  };
}

function mapAdminUser(row: AdminUser): AdminContext {
  return {
    userId: row.auth_user_id ?? row.id,
    email: row.email,
    role: row.role,
    permissions: normalizePermissions(row.permissions),
    profileId: row.id,
  };
}

export async function getAdminUserByAuthId(
  authUserId: string,
): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    permissions: normalizePermissions(data.permissions),
  } as AdminUser;
}

export async function getAdminUserByEmail(
  email: string,
): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    permissions: normalizePermissions(data.permissions),
  } as AdminUser;
}

export async function listEditorUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("role", "editor")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    permissions: normalizePermissions(row.permissions),
  })) as AdminUser[];
}

export async function ensureSuperAdminProfile(
  authUserId: string,
  email: string,
): Promise<AdminUser> {
  const existing = await getAdminUserByAuthId(authUserId);
  if (existing) return existing;

  const superEmail = env.SUPER_ADMIN_EMAIL?.toLowerCase();
  if (!superEmail || email.toLowerCase() !== superEmail) {
    throw new Error("Not authorized as super admin.");
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("admin_users")
    .insert({
      auth_user_id: authUserId,
      email: email.toLowerCase(),
      role: "super_admin",
      permissions: permissionsForRole("super_admin"),
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    permissions: normalizePermissions(data.permissions),
  } as AdminUser;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  if (await hasDevSession()) {
    return devAdminContext();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  let profile = await getAdminUserByAuthId(user.id);

  if (!profile && env.SUPER_ADMIN_EMAIL) {
    if (user.email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase()) {
      try {
        profile = await ensureSuperAdminProfile(user.id, user.email);
      } catch {
        return null;
      }
    }
  }

  if (!profile || !profile.is_active) return null;

  return mapAdminUser(profile);
}
