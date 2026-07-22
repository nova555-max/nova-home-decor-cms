import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import {
  STARTUP_QUERY_TIMEOUT_MS,
  withTimeoutFallback,
} from "@/lib/fetch/with-timeout";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { createPublicClient } from "@/lib/supabase/public";
import type { HeroSlide } from "@/types/hero-slides";

async function readLocalSlides(): Promise<HeroSlide[]> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(
      join(process.cwd(), ".data", "hero-slides.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as HeroSlide[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isPubliclyVisible(slide: HeroSlide, now = Date.now()): boolean {
  if (!slide.is_active || !slide.image_url) return false;
  if (slide.starts_at) {
    const start = new Date(slide.starts_at).getTime();
    if (!Number.isNaN(start) && start > now) return false;
  }
  if (slide.ends_at) {
    const end = new Date(slide.ends_at).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  return true;
}

async function fetchPublicHeroSlides(): Promise<HeroSlide[]> {
  if (isLocalDevCms()) {
    const local = await readLocalSlides();
    return local
      .filter((s) => isPubliclyVisible(s))
      .sort((a, b) => a.display_order - b.display_order)
      .slice(0, 10);
  }

  const supabase = createPublicClient();
  return withTimeoutFallback(
    (async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[hero-slides] public fetch", error.message);
        return [];
      }
      if (!data?.length) return [];

      const now = Date.now();
      return (data as HeroSlide[])
        .filter((s) => isPubliclyVisible(s, now))
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, 10);
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchPublicHeroSlides",
  );
}

export const getPublicHeroSlides = unstable_cache(
  fetchPublicHeroSlides,
  ["public-hero-slides-v2"],
  { tags: [CACHE_TAGS.heroSlides], revalidate: 30 },
);

export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  if (isLocalDevCms()) {
    const local = await readLocalSlides();
    return [...local].sort((a, b) => a.display_order - b.display_order);
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[hero-slides] admin fetch", error.message);
    if (
      /hero_slides/i.test(error.message) &&
      /schema cache|does not exist|could not find the table/i.test(error.message)
    ) {
      console.error(
        "[hero-slides] Apply supabase/FIX-HERO-SLIDES.sql (migration 029) in Supabase SQL Editor.",
      );
    }
    return [];
  }

  return (data as HeroSlide[]) ?? [];
}
