import { env } from "@/config/env";
import { STORAGE_BUCKET } from "@/lib/constants";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import { safeHeadOk } from "@/lib/fetch/safe-fetch";
import {
  getAdminCategories,
  getAdminSettings,
  getGlobalSearchItems,
} from "@/lib/queries/cms";
import { createCmsClient } from "@/lib/supabase/cms-client";
import type { ActivityItem, DashboardData, SystemStatus } from "@/types/dashboard";
import type {
  Category,
  GalleryItem,
  Product,
  Project,
  WebsiteSettings,
} from "@/types/database";

async function fetchRecentProducts(limit = 5): Promise<Product[]> {
  if (isLocalDevCms()) {
    const { listLocalProducts } = await import("@/lib/dev/local-cms-data");
    const { getAdminCategories } = await import("@/lib/queries/cms");
    const [products, categories] = await Promise.all([
      listLocalProducts(),
      getAdminCategories(),
    ]);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return products.slice(0, limit).map((product) => ({
      ...product,
      category: product.category_id
        ? (categoryMap.get(product.category_id) ?? null)
        : null,
    }));
  }

  const supabase = await createCmsClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Product[];
}

async function fetchRecentProjects(limit = 5): Promise<Project[]> {
  if (isLocalDevCms()) {
    const { listLocalProjects } = await import("@/lib/dev/local-cms-data");
    const projects = await listLocalProjects();
    return projects.slice(0, limit);
  }

  const supabase = await createCmsClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Project[];
}

async function fetchRecentGallery(limit = 6): Promise<GalleryItem[]> {
  if (isLocalDevCms()) {
    const { listLocalGallery } = await import("@/lib/dev/local-cms-data");
    const gallery = await listLocalGallery();
    return gallery.slice(0, limit);
  }

  const supabase = await createCmsClient();
  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as GalleryItem[];
}

async function fetchDashboardStats() {
  if (isLocalDevCms()) {
    const { listLocalProducts, listLocalProjects, listLocalGallery } =
      await import("@/lib/dev/local-cms-data");
    const [categories, products, projects, gallery] = await Promise.all([
      getAdminCategories(),
      listLocalProducts(),
      listLocalProjects(),
      listLocalGallery(),
    ]);
    return {
      categories: categories.length,
      products: products.length,
      projects: projects.length,
      gallery: gallery.length,
      featuredProducts: products.filter((p) => p.is_featured).length,
      publishedProducts: products.filter(
        (p) => p.status === "published" && p.is_active,
      ).length,
      hiddenProducts: products.filter(
        (p) => p.status !== "published" || !p.is_active,
      ).length,
      visitors: 0,
    };
  }

  const supabase = await createCmsClient();
  const [
    categories,
    products,
    projects,
    gallery,
    featured,
    published,
    hidden,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("gallery_items")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_featured", true),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "published")
      .eq("is_active", true),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .or("status.neq.published,is_active.eq.false"),
  ]);

  return {
    categories: categories.count ?? 0,
    products: products.count ?? 0,
    projects: projects.count ?? 0,
    gallery: gallery.count ?? 0,
    featuredProducts: featured.count ?? 0,
    publishedProducts: published.count ?? 0,
    hiddenProducts: hidden.count ?? 0,
    visitors: 0,
  };
}

async function checkSystemStatus(): Promise<SystemStatus> {
  if (isLocalDevCms()) {
    return {
      supabaseConnected: true,
      databaseHealthy: true,
      storageConnected: true,
      websiteOnline: true,
    };
  }

  const supabase = await createCmsClient();
  let supabaseConnected = false;
  let databaseHealthy = false;
  let storageConnected = false;

  try {
    const { error } = await supabase.from("categories").select("id").limit(1);
    supabaseConnected = !error;
    databaseHealthy = !error;
  } catch {
    supabaseConnected = false;
    databaseHealthy = false;
  }

  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).list("", {
      limit: 1,
    });
    storageConnected = !error;
  } catch {
    storageConnected = false;
  }

  let websiteOnline = true;
  if (process.env.NODE_ENV !== "development") {
    websiteOnline = await safeHeadOk(env.NEXT_PUBLIC_APP_URL);
  }

  return {
    supabaseConnected,
    storageConnected,
    databaseHealthy,
    websiteOnline,
  };
}

function buildActivity(
  products: Product[],
  categories: Category[],
  gallery: GalleryItem[],
  settings: WebsiteSettings | null,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const product of products) {
    const created = new Date(product.created_at).getTime();
    const updated = new Date(product.updated_at).getTime();
    const isNew = Math.abs(updated - created) < 60_000;

    items.push({
      id: `product-${product.id}-${isNew ? "created" : "updated"}`,
      type: isNew ? "product_created" : "product_updated",
      entityName: product.name,
      timestamp: isNew ? product.created_at : product.updated_at,
    });
  }

  for (const category of categories.slice(0, 5)) {
    items.push({
      id: `category-${category.id}`,
      type: "category_updated",
      entityName: category.name,
      timestamp: category.updated_at,
    });
  }

  for (const item of gallery.slice(0, 5)) {
    items.push({
      id: `gallery-${item.id}`,
      type: "gallery_uploaded",
      entityName: item.title || "Gallery image",
      timestamp: item.created_at,
    });
  }

  if (settings?.updated_at) {
    items.push({
      id: `settings-${settings.id}`,
      type: "settings_changed",
      entityName: settings.company_name,
      timestamp: settings.updated_at,
    });
  }

  return items
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [
    stats,
    recentProducts,
    recentProjects,
    recentGallery,
    categories,
    settings,
    systemStatus,
    searchItems,
  ] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentProducts(5),
    fetchRecentProjects(5),
    fetchRecentGallery(6),
    getAdminCategories(),
    getAdminSettings(),
    checkSystemStatus(),
    getGlobalSearchItems(),
  ]);

  return {
    stats,
    recentProducts,
    recentProjects,
    recentGallery,
    activity: buildActivity(recentProducts, categories, recentGallery, settings),
    systemStatus,
    settings,
    searchItems,
    categories,
  };
}

/** Request-scoped — must not use unstable_cache (reads dev session cookies). */
export async function getDashboardData(): Promise<DashboardData> {
  return fetchDashboardData();
}
