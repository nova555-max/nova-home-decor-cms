import { LoginHistoryView } from "@/components/admin/login-history-view";
import { getSessionUser, requireAdmin } from "@/lib/supabase/auth";

export default async function AdminLoginHistoryPage() {
  await requireAdmin();
  const user = await getSessionUser();

  return (
    <LoginHistoryView
      email={user?.email ?? ""}
      lastSignInAt={
        user && "last_sign_in_at" in user
          ? (user.last_sign_in_at as string | null)
          : null
      }
    />
  );
}
