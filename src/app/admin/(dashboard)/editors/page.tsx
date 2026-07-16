import { EditorsManager } from "@/components/admin/editors-manager";
import { listEditorUsers } from "@/lib/queries/admin-users";
import { requireSuperAdmin } from "@/lib/supabase/auth";

export default async function EditorsPage() {
  await requireSuperAdmin();
  const editors = await listEditorUsers();

  return <EditorsManager editors={editors} />;
}
