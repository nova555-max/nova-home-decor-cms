import {
  Briefcase,
  ClipboardCheck,
  FileText,
  FolderTree,
  Home,
  LayoutList,
  ImageIcon,
  Images,
  LayoutDashboard,
  MapPin,
  Package,
  Search,
  Settings,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ADMIN_NAV } from "@/lib/constants";

export type AdminNavIconName = (typeof ADMIN_NAV)[number]["icon"] | "Users";

export const ADMIN_NAV_ICONS: Record<AdminNavIconName, LucideIcon> = {
  LayoutDashboard,
  Home,
  LayoutList,
  MapPin,
  FileText,
  FolderTree,
  Package,
  Briefcase,
  Images,
  ImageIcon,
  Search,
  Trash2,
  ClipboardCheck,
  Settings,
  Users,
};

export function getAdminNavIcon(name: AdminNavIconName): LucideIcon {
  return ADMIN_NAV_ICONS[name] ?? LayoutDashboard;
}
