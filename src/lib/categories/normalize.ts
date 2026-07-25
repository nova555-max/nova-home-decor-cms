import type { Category } from "@/types/database";

/** Ensure categories are plain JSON-safe for Client Components. */
export function serializeCategories(items: Category[]): Category[] {
  return (items ?? []).map((item) => ({
    id: String(item.id),
    name: item.name ?? "",
    slug: item.slug ?? "",
    description: item.description ?? null,
    name_i18n: item.name_i18n ?? null,
    description_i18n: item.description_i18n ?? null,
    image_url: item.image_url ?? null,
    icon: item.icon ?? null,
    color: item.color ?? null,
    parent_id: item.parent_id ? String(item.parent_id) : null,
    sort_order: Number.isFinite(item.sort_order) ? item.sort_order : 0,
    is_active: item.is_active !== false,
    seo_title: item.seo_title ?? null,
    seo_description: item.seo_description ?? null,
    deleted_at: item.deleted_at ?? null,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? new Date().toISOString(),
  }));
}

export function dedupeCategories(items: Category[]): Category[] {
  const byId = new Map<string, Category>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}
