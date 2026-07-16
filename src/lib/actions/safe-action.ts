import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";

export type CmsModule =
  | "content"
  | "settings"
  | "homepage"
  | "testimonials"
  | "categories"
  | "products"
  | "projects"
  | "gallery"
  | "media"
  | "dashboard"
  | "seo";

const MODULE_TAGS: Record<CmsModule, string> = {
  content: CACHE_TAGS.content,
  settings: CACHE_TAGS.settings,
  homepage: CACHE_TAGS.homepage,
  testimonials: CACHE_TAGS.testimonials,
  categories: CACHE_TAGS.categories,
  products: CACHE_TAGS.products,
  projects: CACHE_TAGS.projects,
  gallery: CACHE_TAGS.gallery,
  media: CACHE_TAGS.media,
  dashboard: CACHE_TAGS.dashboard,
  seo: CACHE_TAGS.settings,
};

export function revalidateModules(...modules: CmsModule[]) {
  const unique = new Set(modules);
  for (const cmsModule of unique) {
    revalidateTag(MODULE_TAGS[cmsModule]);
  }
}
