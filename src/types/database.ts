import type { Locale } from "@/config/site";
import type { LocalizedText } from "@/lib/i18n";
import type { SectionManagerState } from "@/types/homepage-sections";

export type EmailAddress = {
  id: string;
  label: string;
  email: string;
};

export type ShowroomThemeColors = {
  primary: string;
  primary_hover: string;
  gold: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
};

export type WebsiteSettings = {
  id: string;
  company_logo: string | null;
  favicon_url: string | null;
  company_name: string;
  company_description: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  google_maps_url: string | null;
  company_address: string | null;
  latitude: number | null;
  longitude: number | null;
  working_hours: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  snapchat_url: string | null;
  telegram_url: string | null;
  youtube_url?: string | null;
  email_addresses: EmailAddress[];
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  theme_colors?: ShowroomThemeColors | null;
  updated_at: string;
};

export type HeroSection = {
  title: string;
  subtitle: string;
  description?: string;
  cta_primary: string;
  cta_secondary: string;
  cta_contact?: string;
  /** Primary / legacy single image (kept in sync with images[0]). */
  image_url?: string;
  /** Up to 8 hero background images; first is the primary. */
  images?: string[];
};

export type StatItem = {
  label: string;
  value: number;
  suffix: string;
};

export type StatsSection = {
  eyebrow: string;
  title: string;
  items: StatItem[];
};

export type QuoteSection = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type ContactSectionContent = {
  title: string;
  subtitle: string;
  hours: string;
};

export type ContactCtaSection = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
};

export type SectionHeadings = {
  categories: string;
  categories_sub: string;
  products: string;
  featured: string;
  latest: string;
  projects: string;
  gallery: string;
  testimonials: string;
  why_us: string;
};

export type AboutSection = {
  title: string;
  content: string;
  image_url?: string;
};

export type WhyChooseItem = {
  title: string;
  description: string;
};

export type WhyChooseUsSection = {
  title: string;
  items: WhyChooseItem[];
};

export type SectionVisibility = {
  hero: boolean;
  about: boolean;
  categories: boolean;
  featured_products: boolean;
  latest_products: boolean;
  projects: boolean;
  gallery: boolean;
  why_choose_us: boolean;
  testimonials: boolean;
  stats: boolean;
  quote: boolean;
  contact: boolean;
  contact_cta: boolean;
  footer: boolean;
  ai_assistant: boolean;
};

export type HomepageContent = {
  id: string;
  hero: Record<Locale, HeroSection>;
  about: Record<Locale, AboutSection>;
  why_choose_us: Record<Locale, WhyChooseUsSection>;
  stats?: Record<Locale, StatsSection>;
  quote?: Record<Locale, QuoteSection>;
  contact?: Record<Locale, ContactSectionContent>;
  contact_cta?: Record<Locale, ContactCtaSection>;
  section_headings?: Record<Locale, SectionHeadings>;
  section_visibility: SectionVisibility;
  section_manager?: SectionManagerState;
  updated_at: string;
};

export type HomepageContentPayload = Pick<
  HomepageContent,
  | "hero"
  | "about"
  | "why_choose_us"
  | "section_visibility"
  | "section_manager"
  | "stats"
  | "quote"
  | "contact"
  | "contact_cta"
  | "section_headings"
>;

export type Testimonial = {
  id: string;
  author_i18n: LocalizedText;
  content_i18n: LocalizedText;
  role_i18n: LocalizedText;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  name_i18n: LocalizedText | null;
  description_i18n: LocalizedText | null;
  image_url: string | null;
  icon: string | null;
  color: string | null;
  /** Null = top-level category. Set to another category id for a subcategory. */
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductStatus = "draft" | "published";

/** Product price currency — only relevant when `price` is set. */
export type ProductPriceCurrency = "USD" | "IQD";

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  name_i18n: LocalizedText | null;
  description_i18n: LocalizedText | null;
  /** Optional — leave empty in CMS to hide price on the storefront. */
  price: number | null;
  /** USD (dollar) or IQD (Iraqi dinar). Null when price is unset. */
  price_currency: ProductPriceCurrency | null;
  /** Warehouse / inventory product code. */
  sku: string | null;
  image_url: string | null;
  images: string[];
  /** Optional product video (max 1; CMS enforces ≤30s). */
  video_url: string | null;
  related_product_ids: string[];
  status: ProductStatus;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  title_i18n: LocalizedText | null;
  description_i18n: LocalizedText | null;
  client_name: string | null;
  location: string | null;
  cover_image: string | null;
  images: string[];
  completed_at: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GalleryItem = {
  id: string;
  title: string | null;
  image_url: string;
  caption: string | null;
  title_i18n: LocalizedText | null;
  caption_i18n: LocalizedText | null;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAsset = {
  id: string;
  filename: string;
  url: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder: string;
  alt_text: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TrashItem = {
  id: string;
  table:
    "categories" | "products" | "projects" | "gallery_items" | "media_assets";
  title: string;
  deleted_at: string;
};

export type DashboardStats = {
  categories: number;
  products: number;
  projects: number;
  gallery: number;
  testimonials: number;
};

export function categoryName(category: Category, locale: Locale): string {
  return (
    category.name_i18n?.[locale] ||
    category.name_i18n?.ku ||
    category.name ||
    ""
  );
}

export function productName(product: Product, locale: Locale): string {
  return (
    product.name_i18n?.[locale] || product.name_i18n?.ku || product.name || ""
  );
}

export function projectTitle(project: Project, locale: Locale): string {
  return (
    project.title_i18n?.[locale] ||
    project.title_i18n?.ku ||
    project.title ||
    ""
  );
}
