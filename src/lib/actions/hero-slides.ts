"use server";

import { revalidateTag } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { ActionResult } from "@/lib/actions/action-types";
import { actionErrorMessage } from "@/lib/actions/action-utils";
import { CACHE_TAGS } from "@/lib/constants";
import {
  isLocalDevCms,
  needsServiceRoleForWrites,
  SERVICE_ROLE_REQUIRED_MSG,
} from "@/lib/dev/local-mode";
import { assertPersistableMediaUrl } from "@/lib/media/storage-url";
import { getAdminHeroSlides } from "@/lib/queries/hero-slides";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { requirePermission } from "@/lib/supabase/auth";
import { uploadFileAndRegisterAsset } from "@/lib/upload/server-upload";
import {
  HERO_SLIDES_MAX,
  type HeroSlide,
  type HeroSlideInput,
  type HeroSlideUpdate,
} from "@/types/hero-slides";

async function writeLocalSlides(slides: HeroSlide[]): Promise<void> {
  const dir = join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "hero-slides.json"),
    JSON.stringify(slides, null, 2),
    "utf8",
  );
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): { starts_at: string | null; ends_at: string | null } | { error: string } {
  const starts_at = startsAt?.trim() ? new Date(startsAt).toISOString() : null;
  const ends_at = endsAt?.trim() ? new Date(endsAt).toISOString() : null;

  if (starts_at && Number.isNaN(Date.parse(starts_at))) {
    return { error: "Invalid start date." };
  }
  if (ends_at && Number.isNaN(Date.parse(ends_at))) {
    return { error: "Invalid end date." };
  }
  if (starts_at && ends_at && starts_at > ends_at) {
    return { error: "Start date must be before end date." };
  }
  return { starts_at, ends_at };
}

export async function getHeroSliderData(): Promise<HeroSlide[]> {
  await requirePermission("homepage");
  return getAdminHeroSlides();
}

export async function uploadHeroSlideImage(
  formData: FormData,
): Promise<ActionResult<{ publicUrl: string }>> {
  await requirePermission("homepage");

  if (needsServiceRoleForWrites() && !isLocalDevCms()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No image file provided." };
  }

  const result = await uploadFileAndRegisterAsset(file, "hero-slides");
  if (!result.success) return result;

  try {
    assertPersistableMediaUrl(result.data.publicUrl);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Invalid upload URL",
    };
  }

  return { success: true, data: { publicUrl: result.data.publicUrl } };
}

export async function createHeroSlide(
  input: HeroSlideInput,
): Promise<ActionResult<HeroSlide>> {
  await requirePermission("homepage");

  if (needsServiceRoleForWrites() && !isLocalDevCms()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  try {
    assertPersistableMediaUrl(input.image_url);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Invalid image URL",
    };
  }

  const schedule = normalizeSchedule(input.starts_at, input.ends_at);
  if ("error" in schedule) {
    return { success: false, error: schedule.error };
  }

  const existing = await getAdminHeroSlides();
  if (existing.length >= HERO_SLIDES_MAX) {
    return {
      success: false,
      error: `Maximum of ${HERO_SLIDES_MAX} hero slides allowed.`,
    };
  }

  const display_order =
    typeof input.display_order === "number"
      ? input.display_order
      : existing.length === 0
        ? 0
        : Math.max(...existing.map((s) => s.display_order)) + 1;

  const payload = {
    image_url: input.image_url,
    title: normalizeText(input.title),
    subtitle: normalizeText(input.subtitle),
    button_text: normalizeText(input.button_text),
    button_link: normalizeText(input.button_link),
    display_order,
    is_active: input.is_active ?? true,
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
  };

  if (isLocalDevCms()) {
    const now = new Date().toISOString();
    const slide: HeroSlide = {
      id: randomUUID(),
      ...payload,
      created_at: now,
      updated_at: now,
    };
    await writeLocalSlides([...existing, slide]);
    revalidateTag(CACHE_TAGS.heroSlides);
    return { success: true, data: slide };
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: actionErrorMessage(error?.message ?? "Could not create slide."),
    };
  }

  revalidateTag(CACHE_TAGS.heroSlides);
  return { success: true, data: data as HeroSlide };
}

export async function updateHeroSlide(
  id: string,
  patch: HeroSlideUpdate,
): Promise<ActionResult<HeroSlide>> {
  await requirePermission("homepage");

  if (needsServiceRoleForWrites() && !isLocalDevCms()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  if (!id) return { success: false, error: "Slide id is required." };

  if (patch.image_url) {
    try {
      assertPersistableMediaUrl(patch.image_url);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Invalid image URL",
      };
    }
  }

  const schedule = normalizeSchedule(patch.starts_at, patch.ends_at);
  if ("error" in schedule) {
    return { success: false, error: schedule.error };
  }

  const updates: Record<string, unknown> = {};
  if (patch.image_url !== undefined) updates.image_url = patch.image_url;
  if (patch.title !== undefined) updates.title = normalizeText(patch.title);
  if (patch.subtitle !== undefined)
    updates.subtitle = normalizeText(patch.subtitle);
  if (patch.button_text !== undefined)
    updates.button_text = normalizeText(patch.button_text);
  if (patch.button_link !== undefined)
    updates.button_link = normalizeText(patch.button_link);
  if (patch.display_order !== undefined)
    updates.display_order = patch.display_order;
  if (patch.is_active !== undefined) updates.is_active = patch.is_active;
  if (patch.starts_at !== undefined) updates.starts_at = schedule.starts_at;
  if (patch.ends_at !== undefined) updates.ends_at = schedule.ends_at;

  if (isLocalDevCms()) {
    const existing = await getAdminHeroSlides();
    const index = existing.findIndex((s) => s.id === id);
    if (index < 0) return { success: false, error: "Slide not found." };
    const next = {
      ...existing[index],
      ...updates,
      updated_at: new Date().toISOString(),
    } as HeroSlide;
    existing[index] = next;
    await writeLocalSlides(existing);
    revalidateTag(CACHE_TAGS.heroSlides);
    return { success: true, data: next };
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: actionErrorMessage(error?.message ?? "Could not update slide."),
    };
  }

  revalidateTag(CACHE_TAGS.heroSlides);
  return { success: true, data: data as HeroSlide };
}

export async function deleteHeroSlide(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requirePermission("homepage");

  if (needsServiceRoleForWrites() && !isLocalDevCms()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  if (!id) return { success: false, error: "Slide id is required." };

  if (isLocalDevCms()) {
    const existing = await getAdminHeroSlides();
    await writeLocalSlides(existing.filter((s) => s.id !== id));
    revalidateTag(CACHE_TAGS.heroSlides);
    return { success: true, data: { id } };
  }

  const supabase = await createCmsClient();
  const { error } = await supabase.from("hero_slides").delete().eq("id", id);
  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.heroSlides);
  return { success: true, data: { id } };
}

export async function reorderHeroSlides(
  orderedIds: string[],
): Promise<ActionResult<{ count: number }>> {
  await requirePermission("homepage");

  if (needsServiceRoleForWrites() && !isLocalDevCms()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { success: false, error: "Ordered ids required." };
  }

  if (isLocalDevCms()) {
    const existing = await getAdminHeroSlides();
    const byId = new Map(existing.map((s) => [s.id, s]));
    const next = orderedIds
      .map((id, index) => {
        const slide = byId.get(id);
        if (!slide) return null;
        return {
          ...slide,
          display_order: index,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as HeroSlide[];
    const leftovers = existing.filter((s) => !orderedIds.includes(s.id));
    await writeLocalSlides([...next, ...leftovers]);
    revalidateTag(CACHE_TAGS.heroSlides);
    return { success: true, data: { count: next.length } };
  }

  const supabase = await createCmsClient();
  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from("hero_slides")
      .update({ display_order: index })
      .eq("id", orderedIds[index]);
    if (error) {
      return { success: false, error: actionErrorMessage(error.message) };
    }
  }

  revalidateTag(CACHE_TAGS.heroSlides);
  return { success: true, data: { count: orderedIds.length } };
}

export async function saveHeroSlidesBatch(
  slides: Array<
    Pick<
      HeroSlide,
      | "id"
      | "title"
      | "subtitle"
      | "button_text"
      | "button_link"
      | "is_active"
      | "starts_at"
      | "ends_at"
      | "display_order"
    >
  >,
): Promise<ActionResult<{ count: number }>> {
  await requirePermission("homepage");

  if (needsServiceRoleForWrites() && !isLocalDevCms()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  for (const slide of slides) {
    const schedule = normalizeSchedule(slide.starts_at, slide.ends_at);
    if ("error" in schedule) {
      return { success: false, error: schedule.error };
    }

    const result = await updateHeroSlide(slide.id, {
      title: slide.title,
      subtitle: slide.subtitle,
      button_text: slide.button_text,
      button_link: slide.button_link,
      is_active: slide.is_active,
      starts_at: schedule.starts_at,
      ends_at: schedule.ends_at,
      display_order: slide.display_order,
    });
    if (!result.success) return result;
  }

  return { success: true, data: { count: slides.length } };
}
