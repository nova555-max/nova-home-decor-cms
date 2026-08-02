"use client";

import { Bell, Search } from "lucide-react";

import { t } from "@/lib/i18n";
import { getMenuAlign } from "@/lib/rtl";
import { useAdminT, useDirection } from "@/hooks";
import type { AdminContext } from "@/types/admin";
import type { WebsiteSettings } from "@/types/database";
import type { SearchItem } from "@/types/dashboard";
import { GlobalSearch } from "@/components/admin/global-search";
import { UserMenu } from "@/components/admin/user-menu";
import { LocaleSwitcher } from "@/components/public/locale-switcher";
import { SiteBrandLogo } from "@/components/public/site-brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AdminHeaderProps = {
  settings: WebsiteSettings | null;
  adminContext: AdminContext;
  searchItems?: SearchItem[];
};

export function AdminHeader({
  settings,
  adminContext,
  searchItems = [],
}: AdminHeaderProps) {
  const tAdmin = useAdminT();
  const { locale, direction } = useDirection();
  const menuAlign = getMenuAlign(direction);

  return (
    <header className="border-border/40 bg-background/80 sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-2 border-b px-3 py-2 backdrop-blur-xl sm:gap-3 md:px-6">
      <SidebarTrigger className="size-11 min-h-11 min-w-11 rounded-xl md:size-9" />
      <GlobalSearch items={searchItems} className="hidden flex-1 md:flex" />

      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-xl md:hidden"
              aria-label={tAdmin("search.placeholder")}
            />
          }
        >
          <Search className="size-4" />
        </SheetTrigger>
        <SheetContent side="top" className="h-auto max-h-[70dvh] rounded-b-2xl pt-[env(safe-area-inset-top)]">
          <SheetHeader>
            <SheetTitle>{tAdmin("search.placeholder")}</SheetTitle>
          </SheetHeader>
          <div className="px-1 pb-4">
            <GlobalSearch items={searchItems} className="w-full max-w-none" />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
        <SiteBrandLogo
          logoUrl={settings?.company_logo}
          companyName={settings?.company_name ?? "Nova Home Decor"}
          href="/admin"
          size="admin"
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {settings?.company_name ?? "Nova Home Decor"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {tAdmin("shell.admin_panel")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <LocaleSwitcher className="hidden rounded-xl bg-card/80 md:flex" />
        <ThemeToggle className="hidden rounded-xl bg-card/80 md:flex" size="sm" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-xl md:size-9"
              >
                <Bell className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align={menuAlign} className="w-64 rounded-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t(locale, "sections", "products")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="text-muted-foreground px-2 py-6 text-center text-sm">
                —
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <UserMenu adminContext={adminContext} />
      </div>
    </header>
  );
}
