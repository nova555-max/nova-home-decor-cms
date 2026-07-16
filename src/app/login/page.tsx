import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateAdministratorForm } from "@/components/admin/create-administrator-form";
import { isDevAuthEnabled } from "@/lib/auth/dev-session";
import { LoginForm } from "@/components/admin/login-form";
import { LoginThemeToggle } from "@/components/admin/login-theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminContext } from "@/lib/supabase/auth";
import { getAdministratorGate } from "@/lib/queries/admin-users";

export default async function LoginPage() {
  const ctx = await getAdminContext();
  if (ctx) {
    redirect("/admin");
  }

  const gate = await getAdministratorGate();
  const devLogin = isDevAuthEnabled();

  const devEmail = devLogin ? process.env.DEV_ADMIN_EMAIL?.trim() : undefined;
  const showCreateAdministrator = gate === "needs_setup" && !devLogin;

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <LoginThemeToggle />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,color-mix(in_srgb,var(--gold)_10%,transparent),transparent_50%)]" />
      <Suspense
        fallback={<Skeleton className="h-80 w-full max-w-md rounded-[20px]" />}
      >
        {showCreateAdministrator ? (
          <CreateAdministratorForm />
        ) : (
          <LoginForm devEmail={devEmail} devLoginEnabled={devLogin} />
        )}
      </Suspense>
    </div>
  );
}
