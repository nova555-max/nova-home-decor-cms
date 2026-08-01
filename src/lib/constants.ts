export const STORAGE_BUCKET = "cms-uploads";
/** Dedicated public bucket for homepage hero slider images */
export const HERO_SLIDES_BUCKET = "hero_slides";

export const CACHE_TAGS = {
  settings: "website-settings",
  homepage: "homepage-content",
  testimonials: "testimonials",
  categories: "categories",
  products: "products",
  projects: "projects",
  gallery: "gallery",
  dashboard: "dashboard",
  media: "media-assets",
  content: "website-content-strings",
  office: "office-location",
  heroSlides: "hero-slides",
} as const;

export const REALTIME_TABLES = [
  "website_settings",
  "homepage_content",
  "testimonials",
  "categories",
  "products",
  "projects",
  "gallery_items",
  "media_assets",
  "website_content_strings",
  "hero_slides",
] as const;

export const ADMIN_NAV = [
  { titleKey: "dashboard", href: "/admin", icon: "LayoutDashboard" },
  { titleKey: "homepage", href: "/admin/homepage", icon: "Home" },
  { titleKey: "hero_slider", href: "/admin/hero-slider", icon: "Images" },
  { titleKey: "section_visibility", href: "/admin/section-visibility", icon: "LayoutList" },
  { titleKey: "office_location", href: "/admin/office-location", icon: "MapPin" },
  { titleKey: "content", href: "/admin/content", icon: "FileText" },
  { titleKey: "categories", href: "/admin/categories", icon: "FolderTree" },
  { titleKey: "barcodes", href: "/admin/barcodes", icon: "QrCode" },
  { titleKey: "products", href: "/admin/products", icon: "Package" },
  { titleKey: "projects", href: "/admin/projects", icon: "Briefcase" },
  { titleKey: "gallery", href: "/admin/gallery", icon: "Images" },
  { titleKey: "media", href: "/admin/media", icon: "ImageIcon" },
  { titleKey: "seo", href: "/admin/seo", icon: "Search" },
  { titleKey: "trash", href: "/admin/trash", icon: "Trash2" },
  { titleKey: "qa", href: "/admin/qa", icon: "ClipboardCheck" },
  { titleKey: "settings", href: "/admin/settings", icon: "Settings" },
] as const;

export const LOCALES = ["ku", "ar", "en"] as const;

import type { ShowroomThemeColors } from "@/types/database";

export const DEFAULT_SECTION_VISIBILITY = {
  hero: true,
  about: true,
  categories: true,
  featured_products: true,
  latest_products: true,
  projects: true,
  gallery: true,
  why_choose_us: true,
  testimonials: true,
  stats: true,
  quote: true,
  contact: true,
  contact_cta: true,
  footer: true,
  ai_assistant: true,
} as const;

export const DEFAULT_SHOWROOM_THEME: ShowroomThemeColors = {
  primary: "#6b7a3d",
  primary_hover: "#55622f",
  gold: "#c9a96e",
  background: "#f8f7f2",
  foreground: "#2f2f2f",
  muted: "#666666",
  border: "#e8e5dc",
  card: "#ffffff",
};
