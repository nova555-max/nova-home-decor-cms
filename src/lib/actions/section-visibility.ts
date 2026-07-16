"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { actionErrorMessage } from "@/lib/actions/action-utils";
import type { ActionResult } from "@/lib/actions/action-types";
import {
  deriveLegacyVisibility,
  duplicateSectionSetting,
  normalizeSectionManager,
  resetSectionToDefault,
} from "@/lib/homepage/section-registry";
import { saveLocalHomepage, getLocalHomepage } from "@/lib/dev/local-cms-data";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import { getAdminHomepage } from "@/lib/queries/cms";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { requirePermission } from "@/lib/supabase/auth";
import type { HomepageContent } from "@/types/database";
import type {
  HomepageSectionSetting,
  SectionManagerState,
} from "@/types/homepage-sections";

async function persistSectionManager(
  manager: SectionManagerState,
): Promise<ActionResult<HomepageContent>> {
  const section_visibility = deriveLegacyVisibility(manager);

  if (isLocalDevCms()) {
    const current = await getLocalHomepage();
    const saved = await saveLocalHomepage({
      hero: current.hero,
      about: current.about,
      why_choose_us: current.why_choose_us,
      section_visibility,
      section_manager: manager,
    });
    revalidateTag(CACHE_TAGS.homepage);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();
  const { data: existing } = await supabase
    .from("homepage_content")
    .select("id, hero, about, why_choose_us")
    .limit(1)
    .maybeSingle();

  const payload = {
    section_manager: manager,
    section_visibility,
  };

  const { error } = existing?.id
    ? await supabase.from("homepage_content").update(payload).eq("id", existing.id)
    : await supabase.from("homepage_content").insert({
        hero: existing?.hero ?? {},
        about: existing?.about ?? {},
        why_choose_us: existing?.why_choose_us ?? {},
        ...payload,
      });

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.homepage);
  const homepage = await getAdminHomepage();
  return homepage
    ? { success: true, data: homepage }
    : { success: false, error: "Could not reload homepage." };
}

export async function getSectionManagerData(): Promise<SectionManagerState> {
  await requirePermission("homepage");
  const homepage = await getAdminHomepage();
  return normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );
}

export async function toggleSectionLock(
  sectionId: string,
  locked: boolean,
): Promise<ActionResult<HomepageContent>> {
  const ctx = await requirePermission("homepage");

  const homepage = await getAdminHomepage();
  const current = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );

  const section = current.sections.find((item) => item.id === sectionId);
  if (!section) {
    return { success: false, error: "Section not found." };
  }

  if (section.locked && !locked && ctx.role !== "super_admin") {
    return {
      success: false,
      error: "Only Super Admin can unlock sections.",
    };
  }

  const manager: SectionManagerState = {
    ...current,
    sections: current.sections.map((item) =>
      item.id === sectionId ? { ...item, locked } : item,
    ),
  };

  return persistSectionManager(manager);
}

export async function updateSectionManager(
  sections: HomepageSectionSetting[],
): Promise<ActionResult<HomepageContent>> {
  const ctx = await requirePermission("homepage");

  const homepage = await getAdminHomepage();
  const current = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );
  const currentById = new Map(current.sections.map((section) => [section.id, section]));

  const manager: SectionManagerState = {
    ...current,
    sections: sections.map((section, index) => {
      const existing = currentById.get(section.id);
      const locked =
        existing?.locked && ctx.role !== "super_admin"
          ? true
          : section.locked;
      return { ...section, locked, order: index };
    }),
  };

  return persistSectionManager(manager);
}

export async function duplicateHomepageSection(
  sectionId: string,
): Promise<ActionResult<HomepageContent>> {
  await requirePermission("homepage");

  const homepage = await getAdminHomepage();
  const current = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );
  const next = duplicateSectionSetting(current, sectionId);
  if (!next) {
    return { success: false, error: "Section not found." };
  }

  return persistSectionManager(next);
}

export async function resetHomepageSection(
  sectionId: string,
): Promise<ActionResult<HomepageContent>> {
  await requirePermission("homepage");

  const homepage = await getAdminHomepage();
  const current = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );

  return persistSectionManager(resetSectionToDefault(current, sectionId));
}

export async function scheduleHomepageSection(
  sectionId: string,
  scheduled_publish_at: string | null,
  scheduled_unpublish_at: string | null,
): Promise<ActionResult<HomepageContent>> {
  await requirePermission("homepage");

  const homepage = await getAdminHomepage();
  const current = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );

  const manager: SectionManagerState = {
    ...current,
    sections: current.sections.map((section) =>
      section.id === sectionId
        ? { ...section, scheduled_publish_at, scheduled_unpublish_at }
        : section,
    ),
  };

  return persistSectionManager(manager);
}
