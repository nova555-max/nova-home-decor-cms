"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { recordLoginEvent } from "@/lib/auth/client-session";
import { signInAsAdmin } from "@/lib/actions/auth";
import { getAdministratorRegistrationStatus } from "@/lib/actions/setup";
import { useAdminT } from "@/hooks";
import { ButtonLink } from "@/components/ui/button-link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  devEmail?: string;
  devLoginEnabled?: boolean;
  supportEmail?: string | null;
};

export function LoginForm({
  devEmail,
  devLoginEnabled = false,
  supportEmail = null,
}: LoginFormProps = {}) {
  const router = useRouter();
  const t = useAdminT();
  const [email, setEmail] = useState(devEmail ?? "");
  const [password, setPassword] = useState("");
  const [adminExistsOpen, setAdminExistsOpen] = useState(false);
  const [dialogSupportEmail, setDialogSupportEmail] = useState(supportEmail);
  const [isPending, startTransition] = useTransition();
  const [isCheckingRegistration, startRegistrationCheck] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await signInAsAdmin(email, password);
      if (result.success) {
        recordLoginEvent(email.trim().toLowerCase());
        toast.success(t("common.welcome_back"));
        window.location.assign("/admin");
        return;
      }
      toast.error(result.error);
    });
  };

  const handleCreateAccount = () => {
    startRegistrationCheck(async () => {
      const status = await getAdministratorRegistrationStatus();
      if (status.canRegister) {
        router.push("/admin/setup");
        return;
      }
      setDialogSupportEmail(status.supportEmail ?? supportEmail);
      setAdminExistsOpen(true);
    });
  };

  const contactHref = dialogSupportEmail
    ? `mailto:${dialogSupportEmail}`
    : "/#contact";

  return (
    <>
      <Card className="relative z-10 w-full max-w-md rounded-[20px] border-border shadow-soft-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[16px] bg-primary text-lg font-semibold text-primary-foreground">
            N
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">
            Nova Home Decor
          </CardTitle>
          <CardDescription>{t("auth.admin_sign_in")}</CardDescription>
          {devLoginEnabled ? (
            <p className="text-muted-foreground mx-auto max-w-xs text-xs leading-relaxed">
              Dev login — use the email and password from your{" "}
              <code className="text-foreground">.env.local</code> file.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="min-h-12 w-full rounded-[20px] text-base"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("auth.sign_in")
              )}
            </Button>
            <div className="space-y-1 text-center">
              <ButtonLink
                href="/admin/forgot-password"
                variant="link"
                className="text-sm text-[var(--gold)]"
              >
                {t("auth.forgot")}
              </ButtonLink>
              <div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-[var(--gold)]"
                  disabled={isCheckingRegistration}
                  onClick={handleCreateAccount}
                >
                  {isCheckingRegistration ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("auth.create_account")
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={adminExistsOpen} onOpenChange={setAdminExistsOpen}>
        <DialogContent className="rounded-[20px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("auth.admin_exists_title")}</DialogTitle>
            <DialogDescription className="text-start leading-relaxed">
              {t("auth.admin_exists_message")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdminExistsOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <a
              href={contactHref}
              className={cn(buttonVariants({ variant: "gold" }))}
            >
              {t("auth.contact_support")}
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
