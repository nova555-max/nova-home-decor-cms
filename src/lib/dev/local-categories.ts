import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import type { Category } from "@/types/database";
import type { LocalizedText } from "@/lib/i18n";
import { dedupeCategories } from "@/lib/categories/normalize";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import { createPublicClient } from "@/lib/supabase/public";

const DATA_FILE = path.join(process.cwd(), ".data", "categories.json");

export function isLocalCategoriesStore(): boolean {
  return isLocalDevCms();
}

async function fetchRemoteCategories(activeOnly = false): Promise<Category[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

/** Local dev file + Supabase seed categories (local wins on slug conflict). */
export async function listMergedCategories(
  activeOnly = false,
): Promise<Category[]> {
  const [local, remote] = await Promise.all([
    listLocalCategories(false),
    fetchRemoteCategories(false),
  ]);

  const localSlugs = new Set(local.map((item) => item.slug));
  const merged = [
    ...remote.filter((item) => !localSlugs.has(item.slug)),
    ...local,
  ];

  const filtered = activeOnly
    ? merged.filter((item) => item.is_active)
    : merged;

  return dedupeCategories(filtered).sort((a, b) => a.sort_order - b.sort_order);
}

async function readFileCategories(): Promise<Category[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Category[];
  } catch {
    return [];
  }
}

async function writeFileCategories(items: Category[]): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function ensureUniqueSlug(items: Category[], slug: string): string {
  const activeSlugs = new Set(
    items.filter((item) => !item.deleted_at).map((item) => item.slug),
  );
  if (!activeSlugs.has(slug)) return slug;

  let suffix = 2;
  let candidate = `${slug}-${suffix}`;
  while (activeSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${slug}-${suffix}`;
  }
  return candidate;
}

export async function listLocalCategories(
  activeOnly = false,
): Promise<Category[]> {
  const items = (await readFileCategories())
    .filter((item) => !item.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  return activeOnly ? items.filter((item) => item.is_active) : items;
}

export type LocalCategoryInput = {
  id?: string | null;
  name: string;
  slug: string;
  name_i18n: LocalizedText;
  description?: string | null;
  description_i18n?: LocalizedText | null;
  image_url?: string | null;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function upsertLocalCategory(
  input: LocalCategoryInput,
): Promise<Category> {
  const now = new Date().toISOString();
  const items = await readFileCategories();

  if (input.id) {
    const index = items.findIndex((item) => item.id === input.id);
    if (index >= 0) {
      items[index] = {
        ...items[index],
        name: input.name,
        slug: input.slug,
        name_i18n: input.name_i18n,
        description: input.description ?? null,
        description_i18n: input.description_i18n ?? null,
        image_url: input.image_url ?? items[index].image_url,
        icon: input.icon ?? items[index].icon,
        color: input.color ?? items[index].color,
        parent_id: input.parent_id ?? null,
        sort_order: input.sort_order,
        is_active: input.is_active,
        updated_at: now,
      };
      await writeFileCategories(items);
      return items[index];
    }
  }

  const created: Category = {
    id: randomUUID(),
    name: input.name,
    slug: ensureUniqueSlug(items, input.slug),
    description: input.description ?? null,
    name_i18n: input.name_i18n,
    description_i18n: input.description_i18n ?? null,
    image_url: input.image_url ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    parent_id: input.parent_id ?? null,
    sort_order: input.sort_order,
    is_active: input.is_active,
    seo_title: null,
    seo_description: null,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };

  items.push(created);
  await writeFileCategories(items);
  return created;
}

export async function softDeleteLocalCategory(id: string): Promise<void> {
  const now = new Date().toISOString();
  const items = await readFileCategories();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  items[index] = { ...items[index], deleted_at: now, updated_at: now };
  await writeFileCategories(items);
}

export async function reorderLocalCategories(
  orderedIds: string[],
): Promise<void> {
  const items = await readFileCategories();
  const now = new Date().toISOString();
  orderedIds.forEach((id, index) => {
    const item = items.find((entry) => entry.id === id);
    if (item) {
      item.sort_order = index;
      item.updated_at = now;
    }
  });
  await writeFileCategories(items);
}
