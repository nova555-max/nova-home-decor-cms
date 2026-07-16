import { AccountSettings } from "@/components/admin/account-settings";
import { getAdminAccountProfile } from "@/lib/actions/account";
import { requireAdmin } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function AdminProfilePage() {
  await requireAdmin();
  const profile = await getAdminAccountProfile();

  if (!profile) {
    redirect("/admin");
  }

  return <AccountSettings profile={profile} />;
}
