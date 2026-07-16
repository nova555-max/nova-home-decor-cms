"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { recordLoginEvent } from "@/lib/auth/client-session";
import { signInAsAdmin } from "@/lib/actions/auth";
import { useAdminT } from "@/hooks";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  devEmail?: string;
  devLoginEnabled?: boolean;
};

export function LoginForm({
  devEmail,
  devLoginEnabled = false,
}: LoginFormProps = {}) {
  const t = useAdminT();
  const [email, setEmail] = useState(devEmail ?? "");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await signInAsAdmin(email, password);
      if (result.success) {
        recordLoginEvent(email.trim().toLowerCase());
        toast.success(t("common.welcome_back"));
        window.location.assign("/admin");
        return;
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
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
          <div className="text-center">
            <ButtonLink
              href="/admin/forgot-password"
              variant="link"
              className="text-sm text-[var(--gold)]"
            >
              {t("auth.forgot")}
            </ButtonLink>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
