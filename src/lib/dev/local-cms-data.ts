import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { DEFAULT_SECTION_VISIBILITY, DEFAULT_SHOWROOM_THEME } from "@/lib/constants";
import { emptyLocalized } from "@/lib/i18n";
import type {
  GalleryItem,
  HomepageContent,
  HomepageContentPayload,
  Product,
  Project,
  Testimonial,
  WebsiteSettings,
} from "@/types/database";

import { isLocalDevCms } from "@/lib/dev/local-mode";

export { isLocalDevCms };

const DATA_DIR = path.join(process.cwd(), ".data");

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(DATA_DIR, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf8");
}

function now() {
  return new Date().toISOString();
}

const defaultSettings = (): WebsiteSettings => ({
  id: "local-settings",
  company_logo: null,
  favicon_url: null,
  company_name: "Nova Home Decor",
  company_description: null,
  phone_number: null,
  whatsapp_number: null,
  google_maps_url: null,
  company_address: null,
  latitude: null,
  longitude: null,
  working_hours: null,
  facebook_url: null,
  instagram_url: null,
  tiktok_url: null,
  telegram_url: null,
  email_addresses: [],
  seo_title: null,
  seo_description: null,
  og_image: null,
  theme_colors: null,
  updated_at: now(),
});

const defaultHomepage = (): HomepageContent => ({
  id: "local-homepage",
  hero: {
    ku: {
      title: "",
      subtitle: "",
      cta_primary: "",
      cta_secondary: "",
      image_url: "",
    },
    ar: {
      title: "",
      subtitle: "",
      cta_primary: "",
      cta_secondary: "",
      image_url: "",
    },
    en: {
      title: "",
      subtitle: "",
      cta_primary: "",
      cta_secondary: "",
      image_url: "",
    },
  },
  about: {
    ku: { title: "", content: "", image_url: "" },
    ar: { title: "", content: "", image_url: "" },
    en: { title: "", content: "", image_url: "" },
  },
  why_choose_us: {
    ku: { title: "", items: [] },
    ar: { title: "", items: [] },
    en: { title: "", items: [] },
  },
  section_visibility: { ...DEFAULT_SECTION_VISIBILITY },
  updated_at: now(),
});

export async function getLocalSettings(): Promise<WebsiteSettings> {
  const settings = await readJson("settings.json", defaultSettings());
  return {
    ...settings,
    theme_colors: {
      ...DEFAULT_SHOWROOM_THEME,
      ...(settings.theme_colors ?? {}),
    },
  };
}

export async function saveLocalSettings(
  payload: Partial<Omit<WebsiteSettings, "id" | "updated_at">>,
): Promise<WebsiteSettings> {
  const current = await getLocalSettings();
  const saved: WebsiteSettings = {
    ...current,
    ...payload,
    id: current.id,
    email_addresses: payload.email_addresses ?? current.email_addresses,
    updated_at: now(),
  };
  await writeJson("settings.json", saved);
  return saved;
}

export async function listLocalProducts(): Promise<Product[]> {
  const items = await readJson<Product[]>("products.json", []);
  return items
    .filter((item) => !item.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function upsertLocalProduct(
  input: Partial<Product> & Pick<Product, "name" | "slug">,
): Promise<Product> {
  const items = await readJson<Product[]>("products.json", []);
  const timestamp = now();

  if (input.id) {
    const index = items.findIndex((item) => item.id === input.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...input, updated_at: timestamp };
      await writeJson("products.json", items);
      return items[index];
    }
  }

  const created: Product = {
    id: randomUUID(),
    name: input.name,
    name_i18n: input.name_i18n ?? null,
    slug: input.slug,
    category_id: input.category_id ?? null,
    description: input.description ?? null,
    description_i18n: input.description_i18n ?? null,
    price: input.price ?? null,
    sku: input.sku ?? null,
    image_url: input.image_url ?? null,
    images: input.images ?? [],
    video_url: input.video_url ?? null,
    related_product_ids: input.related_product_ids ?? [],
    status: input.status ?? "draft",
    is_featured: input.is_featured ?? false,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? items.length,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    og_image: input.og_image ?? null,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    category: input.category ?? null,
  };
  items.push(created);
  await writeJson("products.json", items);
  return created;
}

export async function softDeleteLocalProduct(id: string): Promise<void> {
  const items = await readJson<Product[]>("products.json", []);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  items[index] = { ...items[index], deleted_at: now(), updated_at: now() };
  await writeJson("products.json", items);
}

export async function reorderLocalProducts(ids: string[]): Promise<void> {
  const items = await readJson<Product[]>("products.json", []);
  const timestamp = now();
  ids.forEach((id, index) => {
    const item = items.find((entry) => entry.id === id);
    if (item) {
      item.sort_order = index;
      item.updated_at = timestamp;
    }
  });
  await writeJson("products.json", items);
}

export async function listLocalProjects(): Promise<Project[]> {
  const items = await readJson<Project[]>("projects.json", []);
  return items
    .filter((item) => !item.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function upsertLocalProject(
  input: Partial<Project> & Pick<Project, "title" | "slug">,
): Promise<Project> {
  const items = await readJson<Project[]>("projects.json", []);
  const timestamp = now();

  if (input.id) {
    const index = items.findIndex((item) => item.id === input.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...input, updated_at: timestamp };
      await writeJson("projects.json", items);
      return items[index];
    }
  }

  const created: Project = {
    id: randomUUID(),
    title: input.title,
    title_i18n: input.title_i18n ?? null,
    slug: input.slug,
    description: input.description ?? null,
    description_i18n: input.description_i18n ?? null,
    client_name: input.client_name ?? null,
    location: input.location ?? null,
    cover_image: input.cover_image ?? null,
    images: input.images ?? [],
    completed_at: input.completed_at ?? null,
    is_featured: input.is_featured ?? false,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? items.length,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    og_image: input.og_image ?? null,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  items.push(created);
  await writeJson("projects.json", items);
  return created;
}

export async function softDeleteLocalProject(id: string): Promise<void> {
  const items = await readJson<Project[]>("projects.json", []);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  items[index] = { ...items[index], deleted_at: now(), updated_at: now() };
  await writeJson("projects.json", items);
}

export async function listLocalGallery(): Promise<GalleryItem[]> {
  const items = await readJson<GalleryItem[]>("gallery.json", []);
  return items
    .filter((item) => !item.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function upsertLocalGalleryItem(
  input: Partial<GalleryItem> & Pick<GalleryItem, "image_url">,
): Promise<GalleryItem> {
  const items = await readJson<GalleryItem[]>("gallery.json", []);
  const timestamp = now();

  if (input.id) {
    const index = items.findIndex((item) => item.id === input.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...input, updated_at: timestamp };
      await writeJson("gallery.json", items);
      return items[index];
    }
  }

  const created: GalleryItem = {
    id: randomUUID(),
    title: input.title ?? null,
    title_i18n: input.title_i18n ?? null,
    image_url: input.image_url,
    caption: input.caption ?? null,
    caption_i18n: input.caption_i18n ?? null,
    sort_order: input.sort_order ?? items.length,
    is_active: input.is_active ?? true,
    deleted_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  items.push(created);
  await writeJson("gallery.json", items);
  return created;
}

export async function insertLocalGalleryBatch(
  rows: Array<
    Pick<GalleryItem, "title" | "image_url" | "caption" | "sort_order" | "is_active">
  >,
): Promise<void> {
  for (const row of rows) {
    await upsertLocalGalleryItem(row);
  }
}

export async function softDeleteLocalGalleryItem(id: string): Promise<void> {
  const items = await readJson<GalleryItem[]>("gallery.json", []);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  items[index] = { ...items[index], deleted_at: now(), updated_at: now() };
  await writeJson("gallery.json", items);
}

export async function reorderLocalGallery(ids: string[]): Promise<void> {
  const items = await readJson<GalleryItem[]>("gallery.json", []);
  const timestamp = now();
  ids.forEach((id, index) => {
    const item = items.find((entry) => entry.id === id);
    if (item) {
      item.sort_order = index;
      item.updated_at = timestamp;
    }
  });
  await writeJson("gallery.json", items);
}

export async function getLocalHomepage(): Promise<HomepageContent> {
  return readJson("homepage.json", defaultHomepage());
}

export async function saveLocalHomepage(
  payload: HomepageContentPayload,
): Promise<HomepageContent> {
  const current = await getLocalHomepage();
  const saved: HomepageContent = {
    ...current,
    ...payload,
    updated_at: now(),
  };
  await writeJson("homepage.json", saved);
  return saved;
}

export async function listLocalTestimonials(): Promise<Testimonial[]> {
  const items = await readJson<Testimonial[]>("testimonials.json", []);
  return items
    .filter((item) => item.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function upsertLocalTestimonial(
  input: Partial<Testimonial>,
): Promise<Testimonial> {
  const items = await readJson<Testimonial[]>("testimonials.json", []);
  const timestamp = now();

  if (input.id) {
    const index = items.findIndex((item) => item.id === input.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...input, updated_at: timestamp };
      await writeJson("testimonials.json", items);
      return items[index];
    }
  }

  const created: Testimonial = {
    id: randomUUID(),
    author_i18n: input.author_i18n ?? emptyLocalized(),
    content_i18n: input.content_i18n ?? emptyLocalized(),
    role_i18n: input.role_i18n ?? emptyLocalized(),
    image_url: input.image_url ?? null,
    sort_order: input.sort_order ?? items.length,
    is_active: input.is_active ?? true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  items.push(created);
  await writeJson("testimonials.json", items);
  return created;
}

export async function deleteLocalTestimonial(id: string): Promise<void> {
  const items = await readJson<Testimonial[]>("testimonials.json", []);
  const filtered = items.filter((item) => item.id !== id);
  await writeJson("testimonials.json", filtered);
}
