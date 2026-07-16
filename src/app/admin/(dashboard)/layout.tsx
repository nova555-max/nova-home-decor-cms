import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { canAccessPath } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccountProfile } from "@/lib/actions/account";
import { getCachedAdminSettings, getCachedGlobalSearchItems } from "@/lib/queries/cms";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAdmin();
  const pathname = (await headers()).get("x-pathname");

  if (pathname && !canAccessPath(ctx, pathname)) {
    redirect("/admin");
  }

  const [settings, searchItems, profile] = await Promise.all([
    getCachedAdminSettings(),
    getCachedGlobalSearchItems(),
    getAdminAccountProfile(),
  ]);

  return (
    <AdminShell
      settings={settings}
      adminContext={ctx}
      searchItems={searchItems}
      preferredTheme={profile?.preferredTheme ?? null}
    >
      {children}
    </AdminShell>
  );
}
