import { ADMIN_NAV } from "@/lib/constants";
import type {
  AdminContext,
  AdminModule,
  AdminPermissions,
  AdminRole,
} from "@/types/admin";
import { ADMIN_MODULES } from "@/types/admin";

export const ALL_ADMIN_PERMISSIONS: AdminPermissions = ADMIN_MODULES.reduce(
  (acc, module) => {
    acc[module] = true;
    return acc;
  },
  {} as AdminPermissions,
);

export const EMPTY_ADMIN_PERMISSIONS: AdminPermissions = ADMIN_MODULES.reduce(
  (acc, module) => {
    acc[module] = false;
    return acc;
  },
  {} as AdminPermissions,
);

export function normalizePermissions(
  input: Partial<AdminPermissions> | null | undefined,
): AdminPermissions {
  return ADMIN_MODULES.reduce((acc, module) => {
    acc[module] = !!input?.[module];
    return acc;
  }, {} as AdminPermissions);
}

export function permissionsForRole(role: AdminRole): AdminPermissions {
  if (role === "super_admin") return ALL_ADMIN_PERMISSIONS;
  return EMPTY_ADMIN_PERMISSIONS;
}

export function hasPermission(
  ctx: Pick<AdminContext, "role" | "permissions">,
  module: AdminModule,
): boolean {
  if (ctx.role === "super_admin") return true;
  return !!ctx.permissions[module];
}

export function canManageEditors(ctx: Pick<AdminContext, "role">): boolean {
  return ctx.role === "super_admin";
}

const ROUTE_MODULE_MAP: Record<string, AdminModule | null> = {
  "/admin": "dashboard",
  "/admin/homepage": "homepage",
  "/admin/hero-slider": "homepage",
  "/admin/section-visibility": "homepage",
  "/admin/office-location": "settings",
  "/admin/content": "content",
  "/admin/categories": "categories",
  "/admin/products": "products",
  "/admin/projects": "projects",
  "/admin/gallery": "gallery",
  "/admin/media": "media",
  "/admin/seo": "seo",
  "/admin/trash": "trash",
  "/admin/qa": "qa",
  "/admin/settings": "settings",
  "/admin/profile": null,
  "/admin/login-history": null,
  "/admin/editors": null,
};

export function moduleForPath(pathname: string): AdminModule | null {
  if (pathname.startsWith("/admin/editors")) return null;
  if (pathname.startsWith("/admin/profile")) return null;
  if (pathname.startsWith("/admin/login-history")) return null;

  for (const item of ADMIN_NAV) {
    if (item.href === "/admin") {
      if (pathname === "/admin") return "dashboard";
      continue;
    }
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return ROUTE_MODULE_MAP[item.href] ?? null;
    }
  }

  return null;
}

export function canAccessPath(
  ctx: Pick<AdminContext, "role" | "permissions">,
  pathname: string,
): boolean {
  if (pathname.startsWith("/admin/editors")) {
    return canManageEditors(ctx);
  }
  if (pathname.startsWith("/admin/profile")) return true;

  const adminModule = moduleForPath(pathname);
  if (!adminModule) return true;
  return hasPermission(ctx, adminModule);
}

export function filterNavForContext(
  ctx: Pick<AdminContext, "role" | "permissions">,
) {
  return ADMIN_NAV.filter((item) => {
    const navModule =
      item.href === "/admin" ? "dashboard" : moduleForPath(item.href);
    return navModule ? hasPermission(ctx, navModule) : true;
  });
}
