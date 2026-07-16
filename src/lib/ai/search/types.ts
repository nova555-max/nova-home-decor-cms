import type { Locale } from "@/config/site";

export type AiChatMode =
  | "general"
  | "quote_assistant"
  | "interior_designer"
  | "visual_search";

/** All 35 Nova showroom AI consultant modules */
export type AiConsultantModule =
  | "product_finder"
  | "personal_shopping"
  | "interior_designer"
  | "visual_search"
  | "similar_products"
  | "alternative_products"
  | "smart_compare"
  | "budget_planner"
  | "room_planner"
  | "material_advisor"
  | "color_advisor"
  | "lighting_advisor"
  | "door_advisor"
  | "window_advisor"
  | "kitchen_advisor"
  | "marble_advisor"
  | "style_detector"
  | "quote_generator"
  | "pdf_catalog"
  | "project_advisor"
  | "sales_consultant"
  | "follow_up"
  | "cross_sell"
  | "upsell"
  | "maintenance_advisor"
  | "warranty_assistant"
  | "favorites_analysis"
  | "customer_profile"
  | "dream_home_planner"
  | "voice_assistant"
  | "image_understanding"
  | "seo_generator"
  | "translation"
  | "smart_notifications"
  | "conversation_history";

export type CmsProductCard = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
  description: string | null;
  matchReasons: string[];
  score: number;
};

export type CmsProjectMatch = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  imageUrl: string | null;
  score: number;
};

export type CmsGalleryMatch = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  score: number;
};

export type CmsCategoryMatch = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  score: number;
};

export type CmsSearchResult = {
  query: string;
  locale: Locale;
  mode: AiChatMode;
  module: AiConsultantModule;
  hasExactMatch: boolean;
  products: CmsProductCard[];
  relatedProducts: CmsProductCard[];
  crossSellProducts: CmsProductCard[];
  upsellProducts: CmsProductCard[];
  categories: CmsCategoryMatch[];
  projects: CmsProjectMatch[];
  gallery: CmsGalleryMatch[];
  companyInfo: {
    name: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
  } | null;
  contentStrings: Array<{ key: string; text: string; score: number }>;
  menuItems: Array<{ key: string; label: string; score: number }>;
  settingsContext: string[];
  homepageMatches: Array<{ section: string; text: string; score: number }>;
  cmsUnavailableMessage: string | null;
  alternativesMessage: string | null;
  totalMatches: number;
};

export type SearchFilters = {
  categories?: string[];
  styles?: string[];
  colors?: string[];
  materials?: string[];
  brands?: string[];
  tags?: string[];
  keywords?: string[];
  budgetMin?: number;
  budgetMax?: number;
  roomSize?: string;
  projectType?: string;
  availability?: "available" | "all";
  luxury?: boolean;
  modern?: boolean;
  villa?: boolean;
};
