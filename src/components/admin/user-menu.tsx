"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ChevronDown,
  ExternalLink,
  Globe,
  History,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  Settings2,
  Sun,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { siteConfig, type Locale } from "@/config/site";
import { signOut } from "@/lib/actions/auth";
import { clearClientSessionData } from "@/lib/auth/client-session";
import { LOGIN_PATH } from "@/lib/auth/config";
import {
  getDisplayName,
  getUserInitials,
  roleLabelKey,
} from "@/lib/auth/display-user";
import { localeLabels } from "@/lib/i18n";
import { getLocaleLabelFontClass, getMenuAlign } from "@/lib/rtl";
import { useAdminT, useDirection, useMounted } from "@/hooks";
import { useThemeActions } from "@/lib/theme/use-theme-actions";
import type { AdminContext } from "@/types/admin";
import { AdminLink } from "@/components/admin/admin-link";
import { LogoutConfirmDialog } from "@/components/admin/logout-confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  adminContext: AdminContext;
  className?: string;
};

const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ku: "rtl",
  ar: "rtl",
  en: "ltr",
};

export function UserMenu({ adminContext, className }: UserMenuProps) {
  const tAdmin = useAdminT();
  const { locale, direction, setLocale } = useDirection();
  const { theme, applyTheme } = useThemeActions();
  const mounted = useMounted();
  const menuAlign = getMenuAlign(direction);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const email = adminContext.email;
  const displayName = getDisplayName(email);
  const initials = getUserInitials(email);
  const roleKey = roleLabelKey(adminContext.role);

  const performLogout = () => {
    startTransition(async () => {
      clearClientSessionData();
      await signOut();
      toast.success(tAdmin("shell.sign_out"));
      window.location.href = LOGIN_PATH;
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "h-9 max-w-[min(100vw-8rem,14rem)] gap-2 rounded-xl ps-1.5 pe-2 sm:max-w-none sm:pe-3",
                className,
              )}
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden min-w-0 flex-col items-start text-start sm:flex">
                <span className="max-w-28 truncate text-xs font-medium leading-none">
                  {displayName}
                </span>
                <span className="text-muted-foreground mt-0.5 max-w-32 truncate text-[10px] leading-none">
                  {email}
                </span>
              </span>
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
            </Button>
          }
        />
        <DropdownMenuContent
          align={menuAlign}
          className="w-[min(calc(100vw-2rem),18rem)] rounded-xl p-1.5"
        >
          <div className="px-2 py-2">
            <div className="flex items-start gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-muted-foreground truncate text-xs">{email}</p>
                <Badge
                  variant="secondary"
                  className="mt-2 rounded-md px-2 py-0 text-[10px] font-medium"
                >
                  {tAdmin(roleKey)}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
          <DropdownMenuItem render={<AdminLink href="/admin/profile" />}>
            <User className="size-4" />
            {tAdmin("user_menu.my_profile")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<AdminLink href="/admin/profile" />}>
            <Settings2 className="size-4" />
            {tAdmin("user_menu.account_settings")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<AdminLink href="/admin/profile#password" />}>
            <KeyRound className="size-4" />
            {tAdmin("user_menu.change_password")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="size-4" />
              {tAdmin("user_menu.language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl">
              <DropdownMenuGroup>
              <DropdownMenuRadioGroup
                value={locale}
                onValueChange={(value) => setLocale(value as Locale)}
              >
                {siteConfig.locales.map((loc) => (
                  <DropdownMenuRadioItem
                    key={loc}
                    value={loc}
                    dir={localeDirection[loc]}
                    className={getLocaleLabelFontClass(loc)}
                  >
                    {localeLabels[loc]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="size-4" />
              {tAdmin("user_menu.theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl">
              {mounted ? (
                <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={theme ?? "system"}
                  onValueChange={(value) =>
                    applyTheme(value as "light" | "dark" | "system")
                  }
                >
                  <DropdownMenuRadioItem value="light">
                    <Sun className="size-4" />
                    {tAdmin("user_menu.theme_light")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon className="size-4" />
                    {tAdmin("user_menu.theme_dark")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Palette className="size-4" />
                    {tAdmin("user_menu.theme_system")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              ) : (
                <div className="text-muted-foreground px-2 py-2 text-xs">…</div>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem render={<AdminLink href="/admin/login-history" />}>
            <History className="size-4" />
            {tAdmin("user_menu.login_history")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem render={<Link href="/" target="_blank" />}>
            <ExternalLink className="size-4" />
            {tAdmin("shell.view_website")}
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            disabled={isPending}
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="size-4" />
            {tAdmin("shell.sign_out")}
          </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={tAdmin("shell.confirm_sign_out_title")}
        description={tAdmin("shell.confirm_sign_out_desc")}
        confirmLabel={tAdmin("shell.sign_out")}
        cancelLabel={tAdmin("common.cancel")}
        loading={isPending}
        onConfirm={performLogout}
      />
    </>
  );
}
