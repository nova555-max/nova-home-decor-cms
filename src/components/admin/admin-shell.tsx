"use client";

import { AdminLink } from "@/components/admin/admin-link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

import { filterNavForContext, canManageEditors } from "@/lib/auth/permissions";
import { getAdminNavIcon } from "@/lib/admin-nav-icons";
import { getSidebarSide } from "@/lib/rtl";
import { cn } from "@/lib/utils";
import { useAdminT, useDirection } from "@/hooks";
import type { AdminContext } from "@/types/admin";
import type { WebsiteSettings } from "@/types/database";
import type { SearchItem } from "@/types/dashboard";
import type { AppTheme } from "@/lib/theme/config";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminAiAssistant } from "@/components/admin/admin-ai-assistant";
import { ThemePreferenceSync } from "@/components/providers/theme-preference-sync";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";

type AdminShellProps = {
  children: React.ReactNode;
  settings: WebsiteSettings | null;
  adminContext: AdminContext;
  searchItems?: SearchItem[];
  preferredTheme?: AppTheme | null;
};

export function AdminShell({
  children,
  settings,
  adminContext,
  searchItems = [],
  preferredTheme,
}: AdminShellProps) {
  const pathname = usePathname();
  const { direction, isSwitching } = useDirection();
  const tAdmin = useAdminT();
  const sidebarSide = getSidebarSide(direction);
  const navItems = filterNavForContext(adminContext);
  const showEditors = canManageEditors(adminContext);

  return (
    <SidebarProvider defaultOpen>
      <ThemePreferenceSync preferredTheme={preferredTheme} />
      <Sidebar
        key={sidebarSide}
        side={sidebarSide}
        variant="floating"
        collapsible="icon"
        dir={direction}
        className="border-none transition-[left,right] duration-300 ease-out"
      >
        <SidebarHeader className="px-3 py-4">
          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold tracking-tight">Nova</p>
            <p className="text-muted-foreground text-[11px]">{tAdmin("shell.cms")}</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] tracking-wide uppercase">
              {tAdmin("shell.modules")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = getAdminNavIcon(item.icon);
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<AdminLink href={item.href} />}
                        isActive={isActive}
                        tooltip={tAdmin(`nav.${item.titleKey}`)}
                        className="rounded-xl transition-all duration-200"
                      >
                        <Icon />
                        <span>{tAdmin(`nav.${item.titleKey}`)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {showEditors ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<AdminLink href="/admin/editors" />}
                      isActive={pathname.startsWith("/admin/editors")}
                      tooltip={tAdmin("nav.editors")}
                      className="rounded-xl transition-all duration-200"
                    >
                      <Users />
                      <span>{tAdmin("nav.editors")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin,padding] duration-300 ease-out",
          isSwitching && "pointer-events-none",
        )}
      >
        <AdminHeader
          settings={settings}
          adminContext={adminContext}
          searchItems={searchItems}
        />
        <main
          className={cn(
            "flex-1 overflow-x-hidden p-3 text-start transition-opacity duration-300 ease-out sm:p-4 md:p-6 lg:p-8",
            isSwitching && "opacity-95",
          )}
        >
          {children}
        </main>
        <AdminAiAssistant />
      </div>
    </SidebarProvider>
  );
}
