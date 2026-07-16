"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { actionErrorMessage } from "@/lib/actions/action-utils";
import type { ActionResult } from "@/lib/actions/action-types";
import { parseFormJson } from "@/lib/actions/action-helpers";
import {
  isLocalCategoriesStore,
  reorderLocalCategories,
} from "@/lib/dev/local-categories";
import {
  deleteLocalTestimonial,
  saveLocalHomepage,
  upsertLocalTestimonial,
} from "@/lib/dev/local-cms-data";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { requirePermission } from "@/lib/supabase/auth";
import type { HomepageContent, HomepageContentPayload, Testimonial } from "@/types/database";

export async function updateHomepageContent(
  payload: HomepageContentPayload,
): Promise<ActionResult> {
  await requirePermission("homepage");

  if (isLocalDevCms()) {
    await saveLocalHomepage(payload);
    revalidateTag(CACHE_TAGS.homepage);
    return { success: true };
  }

  const supabase = await createCmsClient();

  const { data: existing } = await supabase
    .from("homepage_content")
    .select("id")
    .limit(1)
    .single();

  const { error } = existing
    ? await supabase
        .from("homepage_content")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("homepage_content").insert(payload);

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.homepage);
  return { success: true };
}

export async function saveTestimonial(
  formData: FormData,
): Promise<ActionResult<Testimonial>> {
  await requirePermission("homepage");
  const id = formData.get("id") as string | null;

  const authorResult = parseFormJson<Record<string, string>>(
    formData.get("author_i18n"),
    {},
  );
  if (!authorResult.ok) {
    return { success: false, error: authorResult.error };
  }
  const contentResult = parseFormJson<Record<string, string>>(
    formData.get("content_i18n"),
    {},
  );
  if (!contentResult.ok) {
    return { success: false, error: contentResult.error };
  }
  const roleResult = parseFormJson<Record<string, string>>(
    formData.get("role_i18n"),
    {},
  );
  if (!roleResult.ok) {
    return { success: false, error: roleResult.error };
  }

  const payload = {
    author_i18n: authorResult.value,
    content_i18n: contentResult.value,
    role_i18n: roleResult.value,
    image_url: (formData.get("image_url") as string) || null,
    sort_order: Number(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "true",
  };

  if (isLocalDevCms()) {
    const saved = await upsertLocalTestimonial({ id: id ?? undefined, ...payload });
    revalidateTag(CACHE_TAGS.testimonials);
    revalidateTag(CACHE_TAGS.homepage);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();

  const { data, error } = id
    ? await supabase
        .from("testimonials")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase.from("testimonials").insert(payload).select("*").single();

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.testimonials);
  revalidateTag(CACHE_TAGS.homepage);
  return { success: true, data: data as Testimonial };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  await requirePermission("homepage");

  if (isLocalDevCms()) {
    await deleteLocalTestimonial(id);
    revalidateTag(CACHE_TAGS.testimonials);
    return { success: true };
  }

  const supabase = await createCmsClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }
  revalidateTag(CACHE_TAGS.testimonials);
  return { success: true };
}

export async function reorderCategories(
  orderedIds: string[],
): Promise<ActionResult> {
  await requirePermission("categories");

  if (isLocalCategoriesStore()) {
    await reorderLocalCategories(orderedIds);
    revalidateTag(CACHE_TAGS.categories);
    return { success: true };
  }

  const supabase = await createCmsClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("categories").update({ sort_order: index }).eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, error: actionErrorMessage(failed.error.message) };
  }

  revalidateTag(CACHE_TAGS.categories);
  return { success: true };
}
