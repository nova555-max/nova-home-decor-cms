"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { forgotPassword } from "@/lib/actions/auth";
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

export function ForgotPasswordForm() {
  const t = useAdminT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await forgotPassword(email);
      if (result.success) {
        setSent(true);
        toast.success(t("auth.check_email"));
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card className="relative z-10 w-full max-w-md rounded-[20px] border-border shadow-soft-lg">
      <CardHeader className="space-y-3 text-center">
        <CardTitle className="font-display text-xl tracking-tight">
          {t("auth.forgot_title")}
        </CardTitle>
        <CardDescription>{t("auth.forgot_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-muted-foreground text-center text-sm">
            {t("auth.sent_message")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full rounded-[20px] py-5"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("auth.send_reset")
              )}
            </Button>
          </form>
        )}
        <div className="mt-4 text-center">
          <ButtonLink href="/login" variant="link" className="text-sm text-[var(--gold)]">
            {t("auth.back_to_login")}
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
