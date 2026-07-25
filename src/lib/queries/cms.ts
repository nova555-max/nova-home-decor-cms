import { unstable_cache } from "next/cache";

import { CACHE_TAGS, DEFAULT_SECTION_VISIBILITY, DEFAULT_SHOWROOM_THEME } from "@/lib/constants";
import {
  normalizeSectionManager,
  deriveLegacyVisibility,
} from "@/lib/homepage/section-registry";
import {
  isLocalCategoriesStore,
  listMergedCategories,
  listLocalCategories,
} from "@/lib/dev/local-categories";
import {
  getLocalHomepage,
  getLocalSettings,
  listLocalGallery,
  listLocalProducts,
  listLocalProjects,
  listLocalTestimonials,
} from "@/lib/dev/local-cms-data";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import {
  isLocalDevStorage,
  listLocalMediaAssets,
} from "@/lib/dev/local-uploads";
import { serializeCategories } from "@/lib/categories/normalize";
import {
  STARTUP_QUERY_TIMEOUT_MS,
  withTimeoutFallback,
} from "@/lib/fetch/with-timeout";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Category,
  DashboardStats,
  GalleryItem,
  HomepageContent,
  MediaAsset,
  Product,
  Project,
  ShowroomThemeColors,
  Testimonial,
  TrashItem,
  WebsiteSettings,
} from "@/types/database";
import type { SearchItem } from "@/types/dashboard";

function resolveThemeColors(
  theme_colors: ShowroomThemeColors | null | undefined,
): ShowroomThemeColors {
  return {
    ...DEFAULT_SHOWROOM_THEME,
    ...(theme_colors ?? {}),
  };
}

function withSettingsDefaults(
  data: WebsiteSettings,
): WebsiteSettings {
  return {
    ...data,
    email_addresses: data.email_addresses ?? [],
    snapchat_url: data.snapchat_url ?? null,
    theme_colors: resolveThemeColors(data.theme_colors),
  };
}

async function fetchSettings(): Promise<WebsiteSettings | null> {
  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[settings:fetch]", error.message);
        }
        return null;
      }
      if (!data) return null;
      return withSettingsDefaults(data as WebsiteSettings);
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    null,
    "fetchSettings",
  );
}

async function fetchCategories(activeOnly = true): Promise<Category[]> {
  if (isLocalCategoriesStore()) {
    return listMergedCategories(activeOnly);
  }

  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      let query = supabase
        .from("categories")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) {
        if (process.env.NODE_ENV === "development") {
          return listLocalCategories(activeOnly);
        }
        return [];
      }
      return data ?? [];
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchCategories",
  );
}

async function fetchProducts(activeOnly = true): Promise<Product[]> {
  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      let query = supabase
        .from("products")
        .select("*, category:categories(*)")
        .is("deleted_at", null)
        .order("sort_order");
      if (activeOnly) {
        query = query.eq("is_active", true).eq("status", "published");
      }
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as Product[];
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchProducts",
  );
}

async function fetchProjects(activeOnly = true): Promise<Project[]> {
  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      let query = supabase
        .from("projects")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return [];
      return data ?? [];
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchProjects",
  );
}

async function fetchGallery(activeOnly = true): Promise<GalleryItem[]> {
  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      let query = supabase
        .from("gallery_items")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return [];
      return data ?? [];
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchGallery",
  );
}

async function fetchHomepage(): Promise<HomepageContent | null> {
  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("homepage_content")
        .select("*")
        .limit(1)
        .single();
      if (error || !data) return null;
      const section_manager = normalizeSectionManager(
        data.section_manager as never,
        {
          ...DEFAULT_SECTION_VISIBILITY,
          ...(data.section_visibility ?? {}),
        },
      );
      return {
        ...data,
        section_manager,
        section_visibility: deriveLegacyVisibility(section_manager),
      } as HomepageContent;
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    null,
    "fetchHomepage",
  );
}

async function fetchTestimonials(activeOnly = true): Promise<Testimonial[]> {
  return withTimeoutFallback(
    (async () => {
      const supabase = createPublicClient();
      let query = supabase.from("testimonials").select("*").order("sort_order");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as Testimonial[];
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchTestimonials",
  );
}

export const getWebsiteSettings = unstable_cache(
  () => fetchSettings(),
  ["website-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 60 },
);

export const getPublicCategories = unstable_cache(
  () => fetchCategories(true),
  ["public-categories"],
  { tags: [CACHE_TAGS.categories], revalidate: 60 },
);

export const getPublicProducts = unstable_cache(
  () => fetchProducts(true),
  ["public-products"],
  { tags: [CACHE_TAGS.products], revalidate: 60 },
);

export const getPublicProjects = unstable_cache(
  () => fetchProjects(true),
  ["public-projects"],
  { tags: [CACHE_TAGS.projects], revalidate: 60 },
);

export const getPublicGallery = unstable_cache(
  () => fetchGallery(true),
  ["public-gallery"],
  { tags: [CACHE_TAGS.gallery], revalidate: 60 },
);

export const getHomepageContent = unstable_cache(
  () => fetchHomepage(),
  ["homepage-content"],
  { tags: [CACHE_TAGS.homepage], revalidate: 60 },
);

export const getPublicTestimonials = unstable_cache(
  () => fetchTestimonials(true),
  ["public-testimonials"],
  { tags: [CACHE_TAGS.testimonials], revalidate: 60 },
);

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createCmsClient();
  const [categories, products, projects, gallery, testimonials] =
    await Promise.all([
      supabase.from("categories").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase
        .from("gallery_items")
        .select("*", { count: "exact", head: true }),
      supabase.from("testimonials").select("*", { count: "exact", head: true }),
    ]);

  return {
    categories: categories.count ?? 0,
    products: products.count ?? 0,
    projects: projects.count ?? 0,
    gallery: gallery.count ?? 0,
    testimonials: testimonials.count ?? 0,
  };
}

export async function getAdminCategories(): Promise<Category[]> {
  if (isLocalCategoriesStore()) {
    return serializeCategories(await listMergedCategories(false));
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order");
  if (error) {
    if (process.env.NODE_ENV === "development") {
      return serializeCategories(await listLocalCategories(false));
    }
    return [];
  }
  return serializeCategories((data ?? []) as Category[]);
}

export async function getAdminProducts() {
  if (isLocalDevCms()) {
    const [products, categories] = await Promise.all([
      listLocalProducts(),
      getAdminCategories(),
    ]);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return products.map((product) => ({
      ...product,
      category: product.category_id
        ? (categoryMap.get(product.category_id) ?? null)
        : null,
    }));
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .is("deleted_at", null)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as Product[];
}

export async function getAdminProjects() {
  if (isLocalDevCms()) {
    return listLocalProjects();
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order");
  if (error) return [];
  return data ?? [];
}

export async function getAdminGallery() {
  if (isLocalDevCms()) {
    return listLocalGallery();
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order");
  if (error) return [];
  return data ?? [];
}

export async function getAdminMedia(): Promise<MediaAsset[]> {
  if (isLocalDevStorage()) {
    const local = await listLocalMediaAssets();
    return local.map(
      (item) =>
        ({
          id: item.id,
          filename: item.filename,
          url: item.url,
          storage_path: item.storage_path,
          mime_type: item.mime_type,
          size_bytes: item.size_bytes,
          folder: item.folder,
          created_at: item.created_at,
          updated_at: item.created_at,
          deleted_at: null,
          alt_text: null,
          tags: [],
        }) as MediaAsset,
    );
  }

  try {
    const supabase = await createCmsClient();
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as MediaAsset[];
  } catch {
    return [];
  }
}

export async function getTrashItems(): Promise<TrashItem[]> {
  try {
    const supabase = await createCmsClient();
    const [categories, products, projects, gallery, media] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,deleted_at")
        .not("deleted_at", "is", null),
      supabase
        .from("products")
        .select("id,name,deleted_at")
        .not("deleted_at", "is", null),
      supabase
        .from("projects")
        .select("id,title,deleted_at")
        .not("deleted_at", "is", null),
      supabase
        .from("gallery_items")
        .select("id,title,deleted_at")
        .not("deleted_at", "is", null),
      supabase
        .from("media_assets")
        .select("id,filename,deleted_at")
        .not("deleted_at", "is", null),
    ]);

    const items: TrashItem[] = [];

    for (const row of categories.data ?? []) {
      items.push({
        id: row.id,
        table: "categories",
        title: row.name,
        deleted_at: row.deleted_at,
      });
    }
    for (const row of products.data ?? []) {
      items.push({
        id: row.id,
        table: "products",
        title: row.name,
        deleted_at: row.deleted_at,
      });
    }
    for (const row of projects.data ?? []) {
      items.push({
        id: row.id,
        table: "projects",
        title: row.title,
        deleted_at: row.deleted_at,
      });
    }
    for (const row of gallery.data ?? []) {
      items.push({
        id: row.id,
        table: "gallery_items",
        title: row.title || "Gallery image",
        deleted_at: row.deleted_at,
      });
    }
    for (const row of media.data ?? []) {
      items.push({
        id: row.id,
        table: "media_assets",
        title: row.filename,
        deleted_at: row.deleted_at,
      });
    }

    return items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  } catch {
    return [];
  }
}

export async function getGlobalSearchItems(): Promise<SearchItem[]> {
  const [products, categories, projects, gallery] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
    getAdminProjects(),
    getAdminGallery(),
  ]);

  const items: SearchItem[] = [];
  for (const product of products) {
    items.push({
      id: product.id,
      type: "product",
      title: product.name,
      subtitle: product.category?.name,
      href: "/admin/products",
    });
  }
  for (const category of categories) {
    items.push({
      id: category.id,
      type: "category",
      title: category.name,
      href: "/admin/categories",
    });
  }
  for (const project of projects) {
    items.push({
      id: project.id,
      type: "project",
      title: project.title,
      href: "/admin/projects",
    });
  }
  for (const item of gallery) {
    items.push({
      id: item.id,
      type: "gallery",
      title: item.title || "Gallery image",
      href: "/admin/gallery",
    });
  }
  return items;
}

export async function getAdminSettings() {
  if (isLocalDevCms()) {
    return getLocalSettings();
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("website_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[settings:admin-fetch]", error.message);
    }
    return null;
  }
  if (!data) return null;
  return withSettingsDefaults(data as WebsiteSettings);
}

export async function getAdminHomepage() {
  if (isLocalDevCms()) {
    const data = await getLocalHomepage();
    const section_manager = normalizeSectionManager(
      data.section_manager,
      data.section_visibility,
    );
    return {
      ...data,
      section_manager,
      section_visibility: deriveLegacyVisibility(section_manager),
    } as HomepageContent;
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("homepage_content")
    .select("*")
    .limit(1)
    .single();
  if (error) return null;
  const section_manager = normalizeSectionManager(
    data.section_manager as never,
    {
      ...DEFAULT_SECTION_VISIBILITY,
      ...(data.section_visibility ?? {}),
    },
  );
  return {
    ...data,
    section_manager,
    section_visibility: deriveLegacyVisibility(section_manager),
  } as HomepageContent;
}

export async function getAdminTestimonials() {
  if (isLocalDevCms()) {
    return listLocalTestimonials();
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as Testimonial[];
}

/** Request-scoped aliases — do not wrap in unstable_cache (uses cookies via createCmsClient). */
export const getCachedAdminSettings = getAdminSettings;
export const getCachedGlobalSearchItems = getGlobalSearchItems;
