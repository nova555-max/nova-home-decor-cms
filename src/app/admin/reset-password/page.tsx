import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { isDevAuthEnabled } from "@/lib/auth/dev-session";
import { LOGIN_PATH } from "@/lib/auth/config";
import { getAdministratorGate } from "@/lib/queries/admin-users";

export default async function ResetPasswordPage() {
  const gate = await getAdministratorGate();
  if (gate === "needs_setup" && !isDevAuthEnabled()) {
    redirect(LOGIN_PATH);
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <ResetPasswordForm />
    </div>
  );
}
