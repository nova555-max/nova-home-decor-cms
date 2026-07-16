"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { requirePermission } from "@/lib/supabase/auth";
import type { AdminModule } from "@/types/admin";

type ActionResult = { success: true } | { success: false; error: string };

type TrashTable =
  "categories" | "products" | "projects" | "gallery_items" | "media_assets";

const PERMISSION_MAP: Record<TrashTable, AdminModule> = {
  categories: "categories",
  products: "products",
  projects: "projects",
  gallery_items: "gallery",
  media_assets: "media",
};

const TAG_MAP: Record<TrashTable, string> = {
  categories: CACHE_TAGS.categories,
  products: CACHE_TAGS.products,
  projects: CACHE_TAGS.projects,
  gallery_items: CACHE_TAGS.gallery,
  media_assets: CACHE_TAGS.media,
};

export async function softDeleteItem(
  table: TrashTable,
  id: string,
): Promise<ActionResult> {
  await requirePermission(PERMISSION_MAP[table]);
  const supabase = await createCmsClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidateTag(TAG_MAP[table]);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true };
}

export async function restoreItem(
  table: TrashTable,
  id: string,
): Promise<ActionResult> {
  await requirePermission("trash");
  const supabase = await createCmsClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidateTag(TAG_MAP[table]);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true };
}

export async function permanentDeleteItem(
  table: TrashTable,
  id: string,
): Promise<ActionResult> {
  await requirePermission("trash");
  const supabase = await createCmsClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidateTag(TAG_MAP[table]);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true };
}
