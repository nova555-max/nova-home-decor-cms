import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/config";
import type { AdminModule } from "@/types/admin";
import { hasDevSession } from "@/lib/auth/dev-session";
import { canManageEditors, hasPermission } from "@/lib/auth/permissions";
import { getAdminContext } from "@/lib/queries/admin-users";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  if (await hasDevSession()) {
    return {
      id: "dev-admin",
      email: process.env.DEV_ADMIN_EMAIL ?? "admin@novahomedecor.com",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAdmin() {
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect(LOGIN_PATH);
  }
  return ctx;
}

export async function requireSuperAdmin() {
  const ctx = await requireAdmin();
  if (!canManageEditors(ctx)) {
    redirect("/admin");
  }
  return ctx;
}

export async function requirePermission(module: AdminModule) {
  const ctx = await requireAdmin();
  if (!hasPermission(ctx, module)) {
    redirect("/admin");
  }
  return ctx;
}

export { getAdminContext };
