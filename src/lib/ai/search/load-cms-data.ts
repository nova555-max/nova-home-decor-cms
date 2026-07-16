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
import { createServiceClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
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
  /** All non-deleted products (includes drafts) for inventory counts. */
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

function createAiSupabaseClient(): {
  client: ReturnType<typeof createPublicClient>;
  usedServiceRole: boolean;
} {
  const serviceKey = getServiceRoleKey();
  if (serviceKey) {
    try {
      return { client: createServiceClient(), usedServiceRole: true };
    } catch (error) {
      console.error(
        "[ai/cms] Failed to create service-role client, falling back to anon:",
        error instanceof Error ? error.message : error,
      );
    }
  } else {
    console.warn(
      "[ai/cms] SUPABASE_SERVICE_ROLE_KEY missing — AI will use anon client (RLS may hide rows).",
    );
  }
  return { client: createPublicClient(), usedServiceRole: false };
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
 * Loads CMS data for the AI assistant using SUPABASE_SERVICE_ROLE_KEY when available.
 * Never throws — logs errors and returns partial data.
 */
export async function loadCmsDataForAi(): Promise<AiCmsSnapshot> {
  const errors: string[] = [];
  const { client, usedServiceRole } = createAiSupabaseClient();

  console.info(
    `[ai/cms] Loading catalog via ${usedServiceRole ? "service role" : "anon"} client`,
  );

  const [
    settingsRow,
    categories,
    allProducts,
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
      () =>
        client
          .from("website_content_strings")
          .select("content_key, published_value"),
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
  const enrichedAll = (allProducts as Product[]).map((p) => ({
    ...p,
    category:
      p.category ??
      (p.category_id ? categoryMap.get(p.category_id) ?? null : null),
  }));

  const products = enrichedAll.filter(
    (p) => p.is_active && p.status === "published",
  );

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
    productsTotal: enrichedAll.length,
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
    allProducts: enrichedAll,
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
    snapshot.allProducts.length === 0 &&
    snapshot.projects.length === 0 &&
    snapshot.gallery.length === 0
  );
}
