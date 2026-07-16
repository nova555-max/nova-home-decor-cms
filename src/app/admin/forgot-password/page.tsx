import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";
import { isDevAuthEnabled } from "@/lib/auth/dev-session";
import { LOGIN_PATH } from "@/lib/auth/config";
import { getAdministratorGate } from "@/lib/queries/admin-users";

export default async function ForgotPasswordPage() {
  const gate = await getAdministratorGate();
  if (gate === "needs_setup" && !isDevAuthEnabled()) {
    redirect(LOGIN_PATH);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(107,122,61,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(201,169,110,0.1),transparent_50%)]" />
      <ForgotPasswordForm />
    </div>
  );
}
