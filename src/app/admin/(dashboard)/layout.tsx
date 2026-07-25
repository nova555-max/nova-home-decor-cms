import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  canAccessPath,
  firstAllowedAdminPath,
} from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccountProfile } from "@/lib/actions/account";
import { getCachedAdminSettings } from "@/lib/queries/cms";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAdmin();
  const pathname = (await headers()).get("x-pathname");

  if (pathname && !canAccessPath(ctx, pathname)) {
    const fallback = firstAllowedAdminPath(ctx);
    if (fallback !== pathname) {
      redirect(fallback);
    }
  }

  // Avoid loading full product/category/project catalogs on every admin
  // navigation — that made the panel feel frozen after login.
  const [settings, profile] = await Promise.all([
    getCachedAdminSettings(),
    getAdminAccountProfile(),
  ]);

  return (
    <AdminShell
      settings={settings}
      adminContext={ctx}
      searchItems={[]}
      preferredTheme={profile?.preferredTheme ?? null}
    >
      {children}
    </AdminShell>
  );
}
