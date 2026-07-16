import { redirect } from "next/navigation";

import { CreateAdministratorForm } from "@/components/admin/create-administrator-form";
import { LoginThemeToggle } from "@/components/admin/login-theme-toggle";
import { isDevAuthEnabled } from "@/lib/auth/dev-session";
import { getAdministratorGate } from "@/lib/queries/admin-users";
import { LOGIN_PATH } from "@/lib/auth/config";

export default async function CreateAdministratorPage() {
  const gate = await getAdministratorGate();

  // Permanently hide once any administrator exists.
  if (gate === "ready") {
    redirect(LOGIN_PATH);
  }

  // Dev cookie auth bypasses DB — send operators to login instead.
  if (isDevAuthEnabled()) {
    redirect(LOGIN_PATH);
  }

  if (gate === "unknown") {
    redirect(LOGIN_PATH);
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <LoginThemeToggle />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,color-mix(in_srgb,var(--gold)_10%,transparent),transparent_50%)]" />
      <CreateAdministratorForm />
    </div>
  );
}
