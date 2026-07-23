import type { SupabaseClient } from "@supabase/supabase-js";

import { createEntitySlug } from "@/lib/format";

export type SlugEntity = "product" | "category" | "project" | "gallery";

const TABLE_BY_ENTITY: Record<SlugEntity, string> = {
  product: "products",
  category: "categories",
  project: "projects",
  gallery: "gallery_items",
};

/**
 * Build a stable non-empty slug base from a name (supports KU/AR via unicode).
 * Example bases: `chair`, `دەرگا`, `project-abc123`
 */
export function buildSlugBase(
  nameOrSlug: string,
  entity: SlugEntity = "product",
): string {
  const raw = nameOrSlug.trim();
  const fromCreate = createEntitySlug(raw || entity, entity);
  return fromCreate || `${entity}-${Date.now().toString(36)}`;
}

/** @deprecated Use buildSlugBase — kept for existing product imports */
export function buildProductSlugBase(nameOrSlug: string): string {
  return buildSlugBase(nameOrSlug, "product");
}

/**
 * Return `base`, or `base-2`, `base-3`, … until free.
 */
export function nextUniqueSlug(base: string, taken: Set<string>): string {
  const normalized = base.trim().toLowerCase() || "item";
  if (!taken.has(normalized)) return normalized;

  let n = 2;
  while (taken.has(`${normalized}-${n}`)) {
    n += 1;
    if (n > 10_000) {
      return `${normalized}-${Date.now().toString(36)}`;
    }
  }
  return `${normalized}-${n}`;
}

export async function fetchTakenSlugs(
  supabase: SupabaseClient,
  entity: SlugEntity,
  excludeId?: string | null,
): Promise<{ taken: Set<string>; ok: boolean }> {
  const table = TABLE_BY_ENTITY[entity];
  const { data, error } = await supabase.from(table).select("id, slug");

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[${entity}:slug] fetchTakenSlugs`, error.message);
    }
    return { taken: new Set(), ok: false };
  }

  const taken = new Set<string>();
  for (const row of data ?? []) {
    if (excludeId && row.id === excludeId) continue;
    if (row.slug) taken.add(String(row.slug).toLowerCase());
  }
  return { taken, ok: true };
}

/** Collect existing product slugs (including soft-deleted) for uniqueness. */
export async function fetchTakenProductSlugs(
  supabase: SupabaseClient,
  excludeId?: string | null,
): Promise<Set<string>> {
  const { taken } = await fetchTakenSlugs(supabase, "product", excludeId);
  return taken;
}

export function ensureUniqueSlugFromList(
  desired: string,
  existingSlugs: string[],
  excludeSlug?: string | null,
  entity: SlugEntity = "product",
): string {
  const taken = new Set(
    existingSlugs
      .map((s) => s.toLowerCase())
      .filter((s) => (excludeSlug ? s !== excludeSlug.toLowerCase() : true)),
  );
  return nextUniqueSlug(buildSlugBase(desired, entity), taken);
}

export async function resolveUniqueSlug(
  supabase: SupabaseClient | null,
  desired: string,
  entity: SlugEntity,
  options?: {
    excludeId?: string | null;
    localSlugs?: string[];
  },
): Promise<string> {
  const base = buildSlugBase(desired, entity);

  if (options?.localSlugs) {
    return ensureUniqueSlugFromList(base, options.localSlugs, undefined, entity);
  }

  if (!supabase) {
    return `${base}-${Date.now().toString(36)}`;
  }

  const { taken, ok } = await fetchTakenSlugs(
    supabase,
    entity,
    options?.excludeId,
  );

  // Fail closed: if we cannot read existing slugs, never collide with a known name.
  if (!ok) {
    return `${base}-${Date.now().toString(36)}`;
  }

  return nextUniqueSlug(base, taken);
}

export async function resolveUniqueProductSlug(
  supabase: SupabaseClient | null,
  desired: string,
  options?: {
    excludeId?: string | null;
    localSlugs?: string[];
  },
): Promise<string> {
  return resolveUniqueSlug(supabase, desired, "product", options);
}

/** True when Postgres unique violation is on slug. */
export function isSlugUniqueViolation(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("slug") &&
    (lower.includes("duplicate") ||
      lower.includes("unique") ||
      lower.includes("_key"))
  );
}
