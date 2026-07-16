"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { changePassword, signOut } from "@/lib/actions/auth";
import { clearClientSessionData } from "@/lib/auth/client-session";
import { LOGIN_PATH } from "@/lib/auth/config";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LogoutConfirmDialog } from "@/components/admin/logout-confirm-dialog";
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

type ProfileFormProps = {
  adminEmail?: string | null;
};

export function ProfileForm({ adminEmail }: ProfileFormProps) {
  const t = useAdminT();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.password_mismatch"));
      return;
    }
    startTransition(async () => {
      const result = await changePassword(current, password);
      if (result.success) {
        toast.success(t("auth.password_updated"));
        setCurrent("");
        setPassword("");
        setConfirm("");
      } else toast.error(result.error);
    });
  };

  const performLogout = () => {
    startTransition(async () => {
      clearClientSessionData();
      await signOut();
      window.location.href = LOGIN_PATH;
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titleKey="pages.profile.title"
        subtitleKey="pages.profile.subtitle"
      />

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("profile.account")}</CardTitle>
          <CardDescription>{adminEmail ?? "—"}</CardDescription>
        </CardHeader>
      </Card>

      <Card id="password" className="border-border/40 scroll-mt-24 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("profile.change_password")}</CardTitle>
          <CardDescription>{t("profile.change_password_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label>{t("profile.current_password")}</Label>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.new_password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.confirm_password")}</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-xl"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={isPending} className="rounded-xl">
              {t("auth.update_password")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("profile.session")}</CardTitle>
          <CardDescription>{t("profile.session_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={isPending}
            onClick={() => setLogoutOpen(true)}
          >
            {t("profile.sign_out_all")}
          </Button>
        </CardContent>
      </Card>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={t("shell.confirm_sign_out_title")}
        description={t("shell.confirm_sign_out_desc")}
        confirmLabel={t("shell.sign_out")}
        cancelLabel={t("common.cancel")}
        loading={isPending}
        onConfirm={performLogout}
      />
    </div>
  );
}
