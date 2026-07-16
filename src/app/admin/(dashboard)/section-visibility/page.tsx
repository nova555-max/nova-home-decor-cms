import { SectionVisibilityManager } from "@/components/admin/section-visibility-manager";
import { getSectionManagerData } from "@/lib/actions/section-visibility";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function SectionVisibilityPage() {
  const [initial, adminContext] = await Promise.all([
    getSectionManagerData(),
    requireAdmin(),
  ]);

  return (
    <SectionVisibilityManager
      initial={initial}
      isSuperAdmin={adminContext.role === "super_admin"}
    />
  );
}
