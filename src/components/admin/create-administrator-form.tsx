"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createFirstAdministrator } from "@/lib/actions/setup";
import { useAdminT } from "@/hooks";
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

export function CreateAdministratorForm() {
  const t = useAdminT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.password_mismatch"));
      return;
    }
    startTransition(async () => {
      const result = await createFirstAdministrator(email, password, confirm);
      if (result.success) {
        toast.success(t("auth.setup_success"));
        window.location.assign("/admin");
        return;
      }
      toast.error(result.error);
    });
  };

  return (
    <Card className="relative z-10 w-full max-w-md rounded-[20px] border-border shadow-soft-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-[16px] bg-primary text-lg font-semibold text-primary-foreground">
          N
        </div>
        <CardTitle className="font-display text-2xl tracking-tight">
          {t("auth.setup_title")}
        </CardTitle>
        <CardDescription>{t("auth.setup_desc")}</CardDescription>
        <p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
          {t("auth.admin_locked_notice")}
        </p>
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t("auth.confirm_password")}</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
              t("auth.setup_submit")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
