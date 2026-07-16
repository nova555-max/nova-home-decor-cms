import type { AdminRole } from "@/types/admin";

export function getUserInitials(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return "A";

  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

export function getDisplayName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "Admin";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function roleLabelKey(role: AdminRole): "roles.super_admin" | "roles.editor" {
  return role === "super_admin" ? "roles.super_admin" : "roles.editor";
}
