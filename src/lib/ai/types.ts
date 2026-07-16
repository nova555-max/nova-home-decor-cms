import type { Locale } from "@/config/site";
import type { CmsProductCard } from "@/lib/ai/search/types";

export type AiAdminTask =
  | "product_description"
  | "project_description"
  | "gallery_caption"
  | "seo_title"
  | "seo_description"
  | "seo_keywords"
  | "seo_social"
  | "translate"
  | "improve_grammar"
  | "marketing_rewrite"
  | "premium_rewrite"
  | "short_version"
  | "long_version";

export type AiEntityType = "product" | "project" | "gallery" | "seo" | "general";

export type AiGenerateContext = {
  entityType?: AiEntityType;
  entityName?: string;
  categoryName?: string;
  location?: string;
  clientName?: string;
  existingText?: string;
  fieldLabel?: string;
  companyName?: string;
};

export type AiGenerateRequest = {
  task: AiAdminTask;
  locale?: Locale;
  sourceLocale?: Locale;
  targetLocales?: Locale[];
  multiline?: boolean;
  context?: AiGenerateContext;
};

export type AiLocalizedResult = Partial<Record<Locale, string>>;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiChatMeta = {
  products: CmsProductCard[];
  relatedProducts: CmsProductCard[];
  crossSellProducts?: CmsProductCard[];
  upsellProducts?: CmsProductCard[];
  hasExactMatch: boolean;
  mode: string;
  module?: string;
  totalMatches: number;
  companyInfo?: {
    name: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

export type AiChatRequest = {
  messages: ChatMessage[];
  locale: Locale;
  favoriteIds?: string[];
  image?: {
    data: string;
    mimeType: string;
  };
};

export type SeoSocialResult = {
  og_title?: AiLocalizedResult;
  og_description?: AiLocalizedResult;
  twitter_title?: AiLocalizedResult;
  twitter_description?: AiLocalizedResult;
  structured_data?: Record<string, unknown>;
};
