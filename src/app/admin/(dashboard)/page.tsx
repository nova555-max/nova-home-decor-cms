import { DashboardView } from "@/components/admin/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/queries/dashboard";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function AdminDashboardPage() {
  const [data, adminContext] = await Promise.all([
    getDashboardData(),
    requireAdmin(),
  ]);

  return <DashboardView data={data} adminContext={adminContext} />;
}
