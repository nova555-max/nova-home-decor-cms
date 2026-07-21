import { createPublicClient } from "@/lib/supabase/public";
import type { ContentStringStore } from "@/types/content";
import type {
  Category,
  GalleryItem,
  HomepageContent,
  Product,
  Project,
  WebsiteSettings,
} from "@/types/database";
import { buildDefaultContentStore } from "@/lib/content/registry";
import { DEFAULT_SECTION_VISIBILITY, DEFAULT_SHOWROOM_THEME } from "@/lib/constants";
import {
  deriveLegacyVisibility,
  normalizeSectionManager,
} from "@/lib/homepage/section-registry";

export type AiCmsSnapshot = {
  settings: WebsiteSettings | null;
  categories: Category[];
  /** Published + active products for customer recommendations. */
  products: Product[];
  /** Alias of published products (drafts never loaded for public AI). */
  allProducts: Product[];
  projects: Project[];
  gallery: GalleryItem[];
  contentStore: ContentStringStore;
  homepage: HomepageContent | null;
  usedServiceRole: boolean;
  errors: string[];
};

function withSettingsDefaults(data: WebsiteSettings): WebsiteSettings {
  return {
    ...data,
    email_addresses: data.email_addresses ?? [],
    theme_colors: {
      ...DEFAULT_SHOWROOM_THEME,
      ...(data.theme_colors ?? {}),
    },
  };
}

async function safeQuery<T>(
  label: string,
  run: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  fallback: T,
  errors: string[],
): Promise<T> {
  try {
    const { data, error } = await run();
    if (error) {
      console.error(`[ai/cms] ${label}:`, error.message);
      errors.push(`${label}: ${error.message}`);
      return fallback;
    }
    return (data ?? fallback) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai/cms] ${label} threw:`, message);
    errors.push(`${label}: ${message}`);
    return fallback;
  }
}

/**
 * Loads published CMS data for the public AI assistant via the anon client (RLS).
 * Never uses the service role — drafts and internal inventory stay private.
 */
export async function loadCmsDataForAi(): Promise<AiCmsSnapshot> {
  const errors: string[] = [];
  const client = createPublicClient();
  const usedServiceRole = false;

  console.info("[ai/cms] Loading catalog via anon client (published-only RLS)");

  const [
    settingsRow,
    categories,
    publishedProducts,
    projects,
    gallery,
    contentRows,
    homepageRow,
  ] = await Promise.all([
    safeQuery(
      "website_settings",
      () =>
        client.from("website_settings").select("*").limit(1).maybeSingle(),
      null,
      errors,
    ),
    safeQuery(
      "categories",
      () =>
        client
          .from("categories")
          .select("*")
          .is("deleted_at", null)
          .eq("is_active", true)
          .order("sort_order"),
      [] as Category[],
      errors,
    ),
    safeQuery(
      "products",
      () =>
        client
          .from("products")
          .select("*, category:categories(*)")
          .is("deleted_at", null)
          .eq("is_active", true)
          .eq("status", "published")
          .order("sort_order"),
      [] as Product[],
      errors,
    ),
    safeQuery(
      "projects",
      () =>
        client
          .from("projects")
          .select("*")
          .is("deleted_at", null)
          .eq("is_active", true)
          .order("sort_order"),
      [] as Project[],
      errors,
    ),
    safeQuery(
      "gallery_items",
      () =>
        client
          .from("gallery_items")
          .select("*")
          .is("deleted_at", null)
          .eq("is_active", true)
          .order("sort_order"),
      [] as GalleryItem[],
      errors,
    ),
    safeQuery(
      "website_content_strings",
      async () => {
        const viaView = await client
          .from("website_content_strings_public")
          .select("content_key, published_value");
        if (!viaView.error) return viaView;
        return client
          .from("website_content_strings")
          .select("content_key, published_value")
          .eq("status", "published");
      },
      [] as Array<{ content_key: string; published_value: ContentStringStore[string] }>,
      errors,
    ),
    safeQuery(
      "homepage_content",
      () => client.from("homepage_content").select("*").limit(1).maybeSingle(),
      null,
      errors,
    ),
  ]);

  const settings = settingsRow
    ? withSettingsDefaults(settingsRow as WebsiteSettings)
    : null;

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const products = (publishedProducts as Product[]).map((p) => ({
    ...p,
    category:
      p.category ??
      (p.category_id ? categoryMap.get(p.category_id) ?? null : null),
  }));

  let contentStore = buildDefaultContentStore();
  if (contentRows.length) {
    const published: ContentStringStore = {};
    for (const row of contentRows) {
      if (row.content_key && row.published_value) {
        published[row.content_key] = row.published_value;
      }
    }
    if (Object.keys(published).length) {
      contentStore = { ...contentStore, ...published };
    }
  }

  let homepage: HomepageContent | null = null;
  if (homepageRow) {
    const section_manager = normalizeSectionManager(
      (homepageRow as HomepageContent).section_manager as never,
      {
        ...DEFAULT_SECTION_VISIBILITY,
        ...((homepageRow as HomepageContent).section_visibility ?? {}),
      },
    );
    homepage = {
      ...(homepageRow as HomepageContent),
      section_manager,
      section_visibility: deriveLegacyVisibility(section_manager),
    };
  }

  console.info("[ai/cms] Snapshot loaded:", {
    usedServiceRole,
    settings: !!settings,
    categories: categories.length,
    productsPublished: products.length,
    projects: projects.length,
    gallery: gallery.length,
    contentKeys: Object.keys(contentStore).length,
    homepage: !!homepage,
    errors: errors.length ? errors : undefined,
  });

  return {
    settings,
    categories,
    products,
    allProducts: products,
    projects,
    gallery,
    contentStore,
    homepage,
    usedServiceRole,
    errors,
  };
}

export function isCmsCatalogEmpty(snapshot: AiCmsSnapshot): boolean {
  return (
    !snapshot.settings?.company_name &&
    snapshot.categories.length === 0 &&
    snapshot.products.length === 0 &&
    snapshot.projects.length === 0 &&
    snapshot.gallery.length === 0
  );
}
