import type { Category } from "@/types/database";

export type CategoryTreeNode = Category & { depth: number };

function childrenMap(categories: Category[]) {
  const map = new Map<string | null, Category[]>();
  for (const category of categories) {
    const key = category.parent_id ?? null;
    const list = map.get(key) ?? [];
    list.push(category);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  return map;
}

/** Flatten categories into a depth-first tree for admin lists / selects. */
export function flattenCategoryTree(
  categories: Category[],
): CategoryTreeNode[] {
  const map = childrenMap(categories);
  const result: CategoryTreeNode[] = [];

  const walk = (parentId: string | null, depth: number) => {
    for (const child of map.get(parentId) ?? []) {
      result.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  };

  walk(null, 0);
  return result;
}

/** Category id + all descendant ids (for product filtering). */
export function getCategorySubtreeIds(
  categories: Category[],
  rootId: string,
): Set<string> {
  const map = childrenMap(categories);
  const ids = new Set<string>([rootId]);

  const walk = (id: string) => {
    for (const child of map.get(id) ?? []) {
      ids.add(child.id);
      walk(child.id);
    }
  };

  walk(rootId);
  return ids;
}

/** Direct children of a category (one level). */
export function getDirectChildren(
  categories: Category[],
  parentId: string | null,
): Category[] {
  return (childrenMap(categories).get(parentId) ?? []).slice();
}

export function categoryHasChildren(
  categories: Category[],
  categoryId: string,
): boolean {
  return getDirectChildren(categories, categoryId).length > 0;
}

/** Top-level categories only. */
export function getRootCategories(categories: Category[]): Category[] {
  return getDirectChildren(categories, null);
}

/** Barcode payload for a root category (stable, printable). */
export function categoryBarcodeValue(category: Pick<Category, "slug" | "id">) {
  const slug = category.slug?.trim();
  if (slug) return `NOVA-${slug}`.toUpperCase().slice(0, 48);
  return `NOVA-${category.id.replace(/-/g, "").slice(0, 12)}`.toUpperCase();
}

export function wouldCreateCategoryCycle(
  categories: Array<Pick<Category, "id" | "parent_id">>,
  categoryId: string | null | undefined,
  parentId: string | null | undefined,
): boolean {
  if (!parentId) return false;
  if (!categoryId) return false;
  if (categoryId === parentId) return true;
  return getCategorySubtreeIds(categories as Category[], categoryId).has(
    parentId,
  );
}

/** Max nesting depth (0 = root). Parent options only allow roots as parents. */
export const CATEGORY_MAX_DEPTH = 1;
