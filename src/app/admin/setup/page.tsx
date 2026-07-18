import { redirect } from "next/navigation";

import { CreateAdministratorForm } from "@/components/admin/create-administrator-form";
import { LoginThemeToggle } from "@/components/admin/login-theme-toggle";
import { LOGIN_PATH } from "@/lib/auth/config";
import { getAdministratorGate } from "@/lib/queries/admin-users";

export default async function CreateAdministratorPage() {
  const gate = await getAdministratorGate();

  // Permanently hidden once any administrator exists.
  if (gate === "ready") {
    redirect(LOGIN_PATH);
  }

  // Service role missing/broken — show setup form anyway so first install is possible
  // once Cloudflare env is fixed; createFirstAdministrator will return a clear error.

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <LoginThemeToggle />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,color-mix(in_srgb,var(--gold)_10%,transparent),transparent_50%)]" />
      <CreateAdministratorForm />
    </div>
  );
}
