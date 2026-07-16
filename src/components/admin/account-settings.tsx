"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  History,
  KeyRound,
  Lock,
  Mail,
  Monitor,
  Shield,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  changeAccountPassword,
  requestEmailChange,
  signOutAllDevices,
  updateAdminProfile,
  type AdminAccountProfile,
} from "@/lib/actions/account";
import { clearClientSessionData } from "@/lib/auth/client-session";
import { LOGIN_PATH } from "@/lib/auth/config";
import {
  formatUserAgent,
  readLoginHistory,
} from "@/lib/auth/client-session";
import { siteConfig, type Locale } from "@/config/site";
import { localeLabels } from "@/lib/i18n";
import {
  getPasswordChecks,
  getPasswordStrengthLabel,
  getPasswordStrengthScore,
} from "@/lib/validation/password";
import { useThemeActions } from "@/lib/theme/use-theme-actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { LogoutConfirmDialog } from "@/components/admin/logout-confirm-dialog";
import { PhoneInputField } from "@/components/admin/phone-input";
import {
  DashboardCard,
} from "@/components/admin/dashboard/dashboard-primitives";
import { useAdminT, useDirection } from "@/hooks";
import { AdminLink } from "@/components/admin/admin-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type AccountSettingsProps = {
  profile: AdminAccountProfile;
};

const sections = [
  { id: "profile", icon: User, labelKey: "account.sections.profile" },
  { id: "email", icon: Mail, labelKey: "account.sections.email" },
  { id: "password", icon: KeyRound, labelKey: "account.sections.password" },
  { id: "security", icon: Shield, labelKey: "account.sections.security" },
] as const;

export function AccountSettings({ profile }: AccountSettingsProps) {
  const t = useAdminT();
  const { locale, setLocale } = useDirection();
  const { applyTheme } = useThemeActions();

  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState(profile.profilePhotoUrl);
  const [preferredLocale, setPreferredLocale] = useState<Locale>(
    profile.preferredLocale ?? locale,
  );
  const [preferredTheme, setPreferredTheme] = useState<
    "light" | "dark" | "system"
  >(profile.preferredTheme ?? "system");

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<string>("profile");

  const passwordChecks = useMemo(
    () => getPasswordChecks(newPassword),
    [newPassword],
  );
  const passwordScore = getPasswordStrengthScore(passwordChecks);
  const passwordLabel = getPasswordStrengthLabel(passwordScore);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && sections.some((section) => section.id === hash)) {
      setActiveSection(hash);
    }
  }, []);

  const mapError = (code: string) => {
    const key = `account.errors.${code}`;
    const translated = t(key);
    return translated === key ? code : translated;
  };

  const handleProfileSave = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateAdminProfile({
        fullName,
        username,
        phone,
        profilePhotoUrl: photoUrl,
        preferredLocale,
        preferredTheme,
      });
      if (result.success) {
        setLocale(preferredLocale);
        applyTheme(preferredTheme);
        toast.success(
          result.message === "PROFILE_UPDATED"
            ? t("account.profile_saved")
            : (result.message ?? t("account.profile_saved")),
        );
      } else {
        toast.error(mapError(result.error));
      }
    });
  };

  const handleEmailChange = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await requestEmailChange(newEmail, emailPassword);
      if (result.success) {
        toast.success(t("account.email_verification_sent"));
        setNewEmail("");
        setEmailPassword("");
      } else {
        toast.error(mapError(result.error));
      }
    });
  };

  const handlePasswordChange = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await changeAccountPassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );
      if (result.success) {
        toast.success(t("auth.password_updated"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(mapError(result.error));
      }
    });
  };

  const performLogoutAll = () => {
    startTransition(async () => {
      clearClientSessionData();
      await signOutAllDevices();
      window.location.href = LOGIN_PATH;
    });
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[22px] border border-border bg-gradient-to-br from-background via-card to-gold/10 p-6 sm:p-7">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
          Nova Home Decor
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          {t("account.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("account.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
          aria-label={t("account.title")}
        >
          {sections.map(({ id, icon: Icon, labelKey }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setActiveSection(id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                activeSection === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(labelKey)}
            </a>
          ))}
        </nav>

        <div className="space-y-6">
          <section id="profile" className="scroll-mt-24">
            <DashboardCard padding="lg">
              <h2 className="text-lg font-semibold text-foreground">
                {t("account.sections.profile")}
              </h2>
              <form onSubmit={handleProfileSave} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label>{t("account.profile_photo")}</Label>
                  <ImageUpload
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    folder="profiles"
                    className="max-w-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("account.full_name")}</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="rounded-xl border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">{t("account.username")}</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="rounded-xl border-border"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("account.login_email")}</Label>
                    <Input
                      value={profile.email}
                      readOnly
                      className="rounded-xl border-border bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("account.phone")}</Label>
                    <PhoneInputField
                      id="phone"
                      value={phone}
                      onChange={setPhone}
                      className="rounded-xl border border-border bg-white px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("account.preferred_language")}</Label>
                    <Select
                      value={preferredLocale}
                      onValueChange={(value) =>
                        setPreferredLocale(value as Locale)
                      }
                    >
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {siteConfig.locales.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {localeLabels[loc]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("account.preferred_theme")}</Label>
                    <Select
                      value={preferredTheme}
                      onValueChange={(value) => {
                        const next = value as "light" | "dark" | "system";
                        setPreferredTheme(next);
                        applyTheme(next);
                      }}
                    >
                      <SelectTrigger className="rounded-xl border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="light">
                          {t("user_menu.theme_light")}
                        </SelectItem>
                        <SelectItem value="dark">
                          {t("user_menu.theme_dark")}
                        </SelectItem>
                        <SelectItem value="system">
                          {t("user_menu.theme_system")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary text-white hover:bg-primary-hover"
                >
                  {t("account.save_profile")}
                </Button>
              </form>
            </DashboardCard>
          </section>

          <section id="email" className="scroll-mt-24">
            <DashboardCard padding="lg">
              <h2 className="text-lg font-semibold text-foreground">
                {t("account.change_email_title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("account.change_email_desc")}
              </p>
              <form onSubmit={handleEmailChange} className="mt-6 max-w-lg space-y-4">
                <div className="space-y-2">
                  <Label>{t("account.current_email")}</Label>
                  <Input
                    value={profile.email}
                    readOnly
                    className="rounded-xl border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">{t("account.new_email")}</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="rounded-xl border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPassword">
                    {t("profile.current_password")}
                  </Label>
                  <Input
                    id="emailPassword"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="rounded-xl border-border"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary text-white hover:bg-primary-hover"
                >
                  {t("account.send_verification")}
                </Button>
              </form>
            </DashboardCard>
          </section>

          <section id="password" className="scroll-mt-24">
            <DashboardCard padding="lg">
              <h2 className="text-lg font-semibold text-foreground">
                {t("profile.change_password")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("profile.change_password_desc")}
              </p>
              <form
                onSubmit={handlePasswordChange}
                className="mt-6 max-w-lg space-y-4"
              >
                <div className="space-y-2">
                  <Label>{t("profile.current_password")}</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="rounded-xl border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.new_password")}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-xl border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.confirm_password")}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-xl border-border"
                    required
                  />
                </div>

                {newPassword ? (
                  <PasswordStrength
                    checks={passwordChecks}
                    score={passwordScore}
                    label={passwordLabel}
                  />
                ) : null}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary text-white hover:bg-primary-hover"
                >
                  {t("auth.update_password")}
                </Button>
              </form>
            </DashboardCard>
          </section>

          <section id="security" className="scroll-mt-24 space-y-6">
            <DashboardCard padding="lg">
              <h2 className="text-lg font-semibold text-foreground">
                {t("account.sections.security")}
              </h2>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">
                    {t("account.two_factor")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("account.two_factor_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-md bg-gold/15 text-gold">
                    {t("account.two_factor_soon")}
                  </Badge>
                  <Switch checked={false} disabled aria-label={t("account.two_factor")} />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  render={<AdminLink href="/admin/login-history" />}
                  variant="outline"
                  className="rounded-xl border-border"
                >
                  <History className="size-4" />
                  {t("account.login_history_link")}
                </Button>
              </div>
            </DashboardCard>

            <div id="sessions" className="scroll-mt-24">
            <DashboardCard padding="lg">
              <h2 className="text-lg font-semibold text-foreground">
                {t("account.sections.sessions")}
              </h2>
              <SessionsList email={profile.email} lastSignInAt={profile.lastSignInAt} />
              <p className="mt-4 text-sm text-muted-foreground">
                {t("account.sign_out_all_desc")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-xl border-border"
                disabled={isPending}
                onClick={() => setLogoutOpen(true)}
              >
                <Lock className="size-4" />
                {t("profile.sign_out_all")}
              </Button>
            </DashboardCard>
            </div>
          </section>
        </div>
      </div>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={t("shell.confirm_sign_out_title")}
        description={t("shell.confirm_sign_out_desc")}
        confirmLabel={t("profile.sign_out_all")}
        cancelLabel={t("common.cancel")}
        loading={isPending}
        onConfirm={performLogoutAll}
      />
    </div>
  );
}

function PasswordStrength({
  checks,
  score,
  label,
}: {
  checks: ReturnType<typeof getPasswordChecks>;
  score: number;
  label: ReturnType<typeof getPasswordStrengthLabel>;
}) {
  const t = useAdminT();
  const strengthLabels = {
    weak: t("account.strength_weak"),
    fair: t("account.strength_fair"),
    good: t("account.strength_good"),
    strong: t("account.strength_strong"),
  } as const;

  const items = [
    { ok: checks.minLength, label: t("account.req_min") },
    { ok: checks.uppercase, label: t("account.req_upper") },
    { ok: checks.lowercase, label: t("account.req_lower") },
    { ok: checks.number, label: t("account.req_number") },
    { ok: checks.special, label: t("account.req_special") },
  ];

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {t("account.password_strength")}
        </p>
        <span className="text-xs font-semibold text-primary">
          {strengthLabels[label]}
        </span>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < score ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(item.ok && "font-medium text-primary")}
          >
            {item.ok ? "✓" : "○"} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionsList({
  email,
  lastSignInAt,
}: {
  email: string;
  lastSignInAt: string | null;
}) {
  const t = useAdminT();
  const [entries, setEntries] = useState(
    () => [] as ReturnType<typeof readLoginHistory>,
  );

  useEffect(() => {
    setEntries(readLoginHistory().filter((entry) => entry.email === email));
  }, [email]);

  const locale =
    typeof navigator !== "undefined" ? navigator.language : "en-US";

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-white text-primary">
          <Monitor className="size-4" />
        </div>
        <div>
          <p className="font-medium text-foreground">{t("account.current_device")}</p>
          <p className="text-sm text-muted-foreground">
            {t("account.current_device_desc")}
          </p>
          {lastSignInAt ? (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(lastSignInAt))}
            </p>
          ) : null}
        </div>
      </div>

      {entries.slice(0, 3).map((entry, index) => (
        <div
          key={`${entry.at}-${index}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
        >
          <span className="text-foreground">{formatUserAgent(entry.userAgent)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(entry.at))}
          </span>
        </div>
      ))}
    </div>
  );
}
