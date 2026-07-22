import type { SupabaseClient } from "@supabase/supabase-js";

import { createEntitySlug } from "@/lib/format";

/**
 * Build a unique product slug: `product`, then `product-2`, `product-3`, …
 * Never returns an empty string.
 */
export function buildProductSlugBase(nameOrSlug: string): string {
  const raw = nameOrSlug.trim();
  const fromCreate = createEntitySlug(raw || "product", "product");
  return fromCreate || `product-${Date.now().toString(36)}`;
}

export function nextUniqueSlug(
  base: string,
  taken: Set<string>,
): string {
  const normalized = base.trim().toLowerCase() || "product";
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

/** Collect existing product slugs (including soft-deleted) for uniqueness. */
export async function fetchTakenProductSlugs(
  supabase: SupabaseClient,
  excludeId?: string | null,
): Promise<Set<string>> {
  const { data, error } = await supabase.from("products").select("id, slug");

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[products:slug] fetchTakenProductSlugs", error.message);
    }
    // Fail open with empty set — insert may still retry via nextUnique on conflict path
    return new Set();
  }

  const taken = new Set<string>();
  for (const row of data ?? []) {
    if (excludeId && row.id === excludeId) continue;
    if (row.slug) taken.add(String(row.slug).toLowerCase());
  }
  return taken;
}

export function ensureUniqueSlugFromList(
  desired: string,
  existingSlugs: string[],
  excludeSlug?: string | null,
): string {
  const taken = new Set(
    existingSlugs
      .map((s) => s.toLowerCase())
      .filter((s) => (excludeSlug ? s !== excludeSlug.toLowerCase() : true)),
  );
  return nextUniqueSlug(buildProductSlugBase(desired), taken);
}

export async function resolveUniqueProductSlug(
  supabase: SupabaseClient | null,
  desired: string,
  options?: {
    excludeId?: string | null;
    localSlugs?: string[];
  },
): Promise<string> {
  const base = buildProductSlugBase(desired);

  if (options?.localSlugs) {
    return ensureUniqueSlugFromList(
      base,
      options.localSlugs,
      undefined,
    );
  }

  if (!supabase) {
    return `${base}-${Date.now().toString(36)}`;
  }

  const taken = await fetchTakenProductSlugs(supabase, options?.excludeId);
  return nextUniqueSlug(base, taken);
}
