import { QaCenterView } from "@/components/admin/qa-center-view";
import { requireAdmin } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function QaCenterPage() {
  const ctx = await requireAdmin();
  if (ctx.role !== "super_admin") {
    redirect("/admin");
  }

  return <QaCenterView initialReport={null} />;
}
