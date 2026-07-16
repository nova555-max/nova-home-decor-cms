"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { forgotPassword, resetPasswordWithOtp } from "@/lib/actions/auth";
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

type Step = "email" | "otp";

export function ForgotPasswordForm() {
  const t = useAdminT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRequestCode = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await forgotPassword(email);
      if (result.success) {
        setStep("otp");
        toast.success(t("auth.check_email"));
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleReset = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.password_mismatch"));
      return;
    }
    startTransition(async () => {
      const result = await resetPasswordWithOtp(email, otp, password);
      if (result.success) {
        toast.success(t("auth.password_updated"));
        router.push("/login");
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
        <CardDescription>
          {step === "email" ? t("auth.forgot_desc") : t("auth.otp_desc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
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
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">{t("auth.otp_code")}</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                placeholder="000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.new_password")}</Label>
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
              className="w-full rounded-[20px] py-5"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("auth.update_password")
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await forgotPassword(email);
                  if (result.success) {
                    toast.success(t("auth.check_email"));
                  } else {
                    toast.error(result.error);
                  }
                });
              }}
            >
              {t("auth.resend_code")}
            </Button>
          </form>
        )}
        <div className="mt-4 text-center">
          <ButtonLink
            href="/login"
            variant="link"
            className="text-sm text-[var(--gold)]"
          >
            {t("auth.back_to_login")}
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
