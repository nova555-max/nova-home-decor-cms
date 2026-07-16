export const ADMIN_MODULES = [
  "dashboard",
  "homepage",
  "content",
  "categories",
  "products",
  "projects",
  "gallery",
  "media",
  "seo",
  "trash",
  "settings",
  "qa",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

export type AdminRole = "super_admin" | "editor";

export type AdminPermissions = Record<AdminModule, boolean>;

export type AdminUser = {
  id: string;
  auth_user_id: string | null;
  email: string;
  role: AdminRole;
  permissions: AdminPermissions;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string | null;
  username?: string | null;
  phone?: string | null;
  profile_photo_url?: string | null;
  preferred_locale?: string | null;
  preferred_theme?: string | null;
  two_factor_enabled?: boolean;
};

export type AdminContext = {
  userId: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermissions;
  profileId: string;
};
