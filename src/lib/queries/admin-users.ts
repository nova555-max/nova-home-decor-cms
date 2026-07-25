import { env } from "@/config/env";
import { hasDevSession } from "@/lib/auth/dev-session";
import { withTimeout } from "@/lib/async/with-timeout";
import {
  ALL_ADMIN_PERMISSIONS,
  normalizePermissions,
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
  // 1) Session client first — RLS "Admins read own profile" works after login
  //    even when SUPABASE_SERVICE_ROLE_KEY is missing/wrong on Netlify.
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        permissions: normalizePermissions(data.permissions),
      } as AdminUser;
    }
    if (error) {
      console.error("[getAdminUserByAuthId] session", error.message);
    }
  } catch (err) {
    console.error(
      "[getAdminUserByAuthId] session",
      err instanceof Error ? err.message : err,
    );
  }

  // 2) Service role — needed when auth_user_id is missing/mismatched or no session yet.
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("admin_users")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.error("[getAdminUserByAuthId] service", error.message);
      return null;
    }
    if (!data) return null;
    return {
      ...data,
      permissions: normalizePermissions(data.permissions),
    } as AdminUser;
  } catch (err) {
    console.error(
      "[getAdminUserByAuthId] service",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function getAdminUserByEmail(
  email: string,
): Promise<AdminUser | null> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("admin_users")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (error) {
      console.error("[getAdminUserByEmail]", error.message);
      return null;
    }
    if (!data) return null;
    return {
      ...data,
      permissions: normalizePermissions(data.permissions),
    } as AdminUser;
  } catch (err) {
    console.error(
      "[getAdminUserByEmail]",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function listEditorUsers(): Promise<AdminUser[]> {
  // Service role avoids intermittent RLS misses when listing editors in admin UI.
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("admin_users")
      .select("*")
      .eq("role", "editor")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      permissions: normalizePermissions(row.permissions),
    })) as AdminUser[];
  } catch (serviceErr) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("role", "editor")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        error.message ||
          (serviceErr instanceof Error ? serviceErr.message : "list editors failed"),
      );
    }
    return (data ?? []).map((row) => ({
      ...row,
      permissions: normalizePermissions(row.permissions),
    })) as AdminUser[];
  }
}

/** Count of lifetime administrator (super_admin) rows — active or not. */
export async function countAdministrators(): Promise<number> {
  const service = createServiceClient();
  const { count, error } = await service
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function hasAdministrator(): Promise<boolean> {
  return (await countAdministrators()) >= 1;
}

/** Safe status for routing when service role may be unavailable. */
export async function getAdministratorGate(): Promise<
  "ready" | "needs_setup" | "unknown"
> {
  try {
    return (await countAdministrators()) >= 1 ? "ready" : "needs_setup";
  } catch (err) {
    console.error(
      "[getAdministratorGate]",
      err instanceof Error ? err.message : err,
    );
    return "unknown";
  }
}

/**
 * @deprecated Auto-bootstrap is disabled. Use createFirstAdministrator on first install only.
 * Kept to reject any leftover callers once an admin already exists.
 */
export async function ensureSuperAdminProfile(
  authUserId: string,
  email: string,
): Promise<AdminUser> {
  void email;
  const existing = await getAdminUserByAuthId(authUserId);
  if (existing) return existing;

  let adminExists = false;
  try {
    adminExists = await hasAdministrator();
  } catch {
    adminExists = true;
  }

  if (adminExists) {
    throw new Error(
      "Administrator already exists. Creating another admin is permanently disabled.",
    );
  }

  throw new Error(
    "Administrator must be created via the Create Administrator setup page.",
  );
}

export async function getAdminContext(): Promise<AdminContext | null> {
  if (await hasDevSession()) {
    return devAdminContext();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await withTimeout(
      supabase.auth.getUser(),
      10_000,
      "Supabase getUser timeout",
    );

    if (!user?.email) return null;

    const profile = await withTimeout(
      getAdminUserByAuthId(user.id),
      10_000,
      "Admin profile timeout",
    );

    if (!profile || !profile.is_active) return null;

    return mapAdminUser(profile);
  } catch (err) {
    console.warn(
      "[getAdminContext]",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
