import type { Locale } from "@/config/site";

export type ContentAdminSection =
  | "home"
  | "about"
  | "products"
  | "categories"
  | "projects"
  | "gallery"
  | "ai"
  | "contact"
  | "statistics"
  | "testimonials"
  | "newsletter"
  | "cta"
  | "footer"
  | "seo"
  | "errors"
  | "loading"
  | "empty_states"
  | "buttons"
  | "navigation"
  | "placeholders"
  | "language_strings";

export type ContentFieldType = "text" | "rich";

export type ContentEntryMeta = {
  key: string;
  section: ContentAdminSection;
  dictSection: string;
  dictKey: string;
  label: string;
  fieldType: ContentFieldType;
  protected?: boolean;
};

export type LocalizedContentValue = Partial<Record<Locale, string>>;

/** Flat map: "hero.luxury_label" -> { ku, ar, en } */
export type ContentStringStore = Record<string, LocalizedContentValue>;

export type ContentVersionSnapshot = {
  id: string;
  label: string;
  published: ContentStringStore;
  created_at: string;
  created_by?: string | null;
};

export type ContentVersionHistoryEntry = {
  id: string;
  content_string_id: string;
  content_key: string;
  version: number;
  previous_version: number | null;
  previous_value: LocalizedContentValue | null;
  current_value: LocalizedContentValue;
  change_type: "draft" | "publish" | "unpublish" | "restore";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteContentStrings = {
  id: string;
  drafts: ContentStringStore;
  published: ContentStringStore;
  versions: ContentVersionSnapshot[];
  keyHistory: ContentVersionHistoryEntry[];
  updated_at: string;
};

export const CONTENT_ADMIN_SECTIONS: {
  id: ContentAdminSection;
  labelKey: string;
}[] = [
  { id: "home", labelKey: "content.sections.home" },
  { id: "about", labelKey: "content.sections.about" },
  { id: "products", labelKey: "content.sections.products" },
  { id: "categories", labelKey: "content.sections.categories" },
  { id: "projects", labelKey: "content.sections.projects" },
  { id: "gallery", labelKey: "content.sections.gallery" },
  { id: "ai", labelKey: "content.sections.ai" },
  { id: "contact", labelKey: "content.sections.contact" },
  { id: "statistics", labelKey: "content.sections.statistics" },
  { id: "testimonials", labelKey: "content.sections.testimonials" },
  { id: "newsletter", labelKey: "content.sections.newsletter" },
  { id: "cta", labelKey: "content.sections.cta" },
  { id: "footer", labelKey: "content.sections.footer" },
  { id: "seo", labelKey: "content.sections.seo" },
  { id: "errors", labelKey: "content.sections.errors" },
  { id: "loading", labelKey: "content.sections.loading" },
  { id: "empty_states", labelKey: "content.sections.empty_states" },
  { id: "buttons", labelKey: "content.sections.buttons" },
  { id: "navigation", labelKey: "content.sections.navigation" },
  { id: "placeholders", labelKey: "content.sections.placeholders" },
  { id: "language_strings", labelKey: "content.sections.language_strings" },
];

export const PROTECTED_CONTENT_KEYS = new Set([
  "footer.rights",
  "footer.credit",
]);
