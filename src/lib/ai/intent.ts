import type { Locale } from "@/config/site";
import {
  CATEGORY_ALIASES,
  COLOR_KEYWORDS,
  MATERIAL_KEYWORDS,
  PROJECT_TYPE_KEYWORDS,
  STYLE_KEYWORDS,
  extractMatches,
  normalizeText,
} from "@/lib/ai/search/keywords";
import { detectConsultantModule } from "@/lib/ai/modules/detect";
import { getModuleDefinition } from "@/lib/ai/modules/registry";
import type {
  AiChatMode,
  AiConsultantModule,
  SearchFilters,
} from "@/lib/ai/search/types";

export type ParsedIntent = {
  locale: Locale;
  mode: AiChatMode;
  module: AiConsultantModule;
  filters: SearchFilters;
  searchQuery: string;
  budgetMentioned: boolean;
  roomSize: string | null;
};

const QUOTE_PATTERNS = [
  /quote|price|cost|budget|estimate|عرض سعر|تكلفة|بودجت|نرخ|نرخی|بودجێت/i,
];

const DESIGNER_PATTERNS = [
  /design|interior|decorate|layout|styling|تصميم|ديكور|دیزاین|نەخشە|دیزاینی ناوەوە/i,
];

const VISUAL_PATTERNS = [
  /image|photo|picture|upload|similar to|like this|صورة|صور|وێنە|شێوەی ئەمە/i,
];

function detectLocale(text: string, fallback: Locale): Locale {
  const arabic = /[\u0600-\u06FF]/;
  const latin = /[a-zA-Z]/;
  if (latin.test(text) && !arabic.test(text)) return "en";
  if (arabic.test(text)) {
    const kurdishMarkers = /[ەێۆڕڵڤگچپژ]/;
    return kurdishMarkers.test(text) ? "ku" : "ar";
  }
  return fallback;
}

function moduleToMode(module: AiConsultantModule): AiChatMode {
  if (module === "quote_generator") return "quote_assistant";
  if (module === "interior_designer" || module === "dream_home_planner") {
    return "interior_designer";
  }
  if (
    module === "visual_search" ||
    module === "similar_products" ||
    module === "image_understanding"
  ) {
    return "visual_search";
  }
  return "general";
}

function detectMode(text: string, hasImage: boolean, module: AiConsultantModule): AiChatMode {
  const fromModule = moduleToMode(module);
  if (fromModule !== "general") return fromModule;
  if (hasImage || VISUAL_PATTERNS.some((p) => p.test(text))) return "visual_search";
  if (QUOTE_PATTERNS.some((p) => p.test(text))) return "quote_assistant";
  if (DESIGNER_PATTERNS.some((p) => p.test(text))) return "interior_designer";
  return "general";
}

function parseBudget(text: string): { min?: number; max?: number } {
  const normalized = normalizeText(text);
  const range = normalized.match(
    /(\d[\d,.\s]*)\s*(?:to|-|تا|حتى|بۆ)\s*(\d[\d,.\s]*)/,
  );
  if (range) {
    const min = parseFloat(range[1].replace(/[,\s]/g, ""));
    const max = parseFloat(range[2].replace(/[,\s]/g, ""));
    if (!Number.isNaN(min) && !Number.isNaN(max)) return { min, max };
  }

  const under = normalized.match(
    /(?:under|below|less than|أقل من|کەمتر لە)\s*(\d[\d,.\s]*)/,
  );
  if (under) {
    const max = parseFloat(under[1].replace(/[,\s]/g, ""));
    if (!Number.isNaN(max)) return { max };
  }

  const over = normalized.match(
    /(?:over|above|more than|أكثر من|زیاتر لە)\s*(\d[\d,.\s]*)/,
  );
  if (over) {
    const min = parseFloat(over[1].replace(/[,\s]/g, ""));
    if (!Number.isNaN(min)) return { min };
  }

  const single = normalized.match(/(\d[\d,.\s]{2,})/);
  if (single) {
    const val = parseFloat(single[1].replace(/[,\s]/g, ""));
    if (!Number.isNaN(val) && val > 50) {
      return { min: val * 0.7, max: val * 1.3 };
    }
  }

  return {};
}

function parseRoomSize(text: string): string | null {
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(?:sqm|m2|m²|square meter|متر|م٢|مەتر)/i,
  );
  return match ? match[0] : null;
}

function detectCategories(text: string): string[] {
  const normalized = normalizeText(text);
  const found: string[] = [];
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((a) => normalized.includes(normalizeText(a)))) {
      found.push(key);
    }
  }
  return found;
}

function detectProjectType(text: string): string | undefined {
  const normalized = normalizeText(text);
  for (const [type, keywords] of Object.entries(PROJECT_TYPE_KEYWORDS)) {
    if (keywords.some((k) => normalized.includes(normalizeText(k)))) {
      return type;
    }
  }
  return undefined;
}

const SHOPPING_PATTERNS = [
  /budget|house type|apartment|villa|room type|preferred style|help me choose|هەڵبژاردن|جۆری ماڵ|شقق|فیلا|ڤیلا|ژووری/i,
];

function parseHouseType(text: string): string | undefined {
  if (/villa|فيلا|ڤیلا/i.test(text)) return "villa";
  if (/apartment|flat|شقق|شقة|شوقە|ئاپارتمان/i.test(text)) return "apartment";
  if (/house|home|منزل|ماڵ|بيت/i.test(text)) return "house";
  if (/office|مكتب|نووسینگە/i.test(text)) return "office";
  return undefined;
}

export function parseIntent(
  message: string,
  fallbackLocale: Locale,
  hasImage = false,
  explicitModule?: AiConsultantModule | null,
): ParsedIntent {
  const locale = detectLocale(message, fallbackLocale);
  const consultantModule = detectConsultantModule(
    message,
    hasImage,
    explicitModule,
  );
  const budget = parseBudget(message);
  const modDef = getModuleDefinition(consultantModule);
  const categories = [
    ...new Set([...detectCategories(message), ...(modDef.categoryHints ?? [])]),
  ];
  const styles = extractMatches(message, STYLE_KEYWORDS);
  const materials = extractMatches(message, MATERIAL_KEYWORDS);
  const colors = extractMatches(message, COLOR_KEYWORDS);
  const projectType = detectProjectType(message) ?? parseHouseType(message);
  const roomSize = parseRoomSize(message);

  const filters: SearchFilters = {
    categories: categories.length ? categories : undefined,
    styles: styles.length ? styles : undefined,
    materials: materials.length ? materials : undefined,
    colors: colors.length ? colors : undefined,
    budgetMin: budget.min,
    budgetMax: budget.max,
    roomSize: roomSize ?? undefined,
    projectType,
    luxury: /luxury|premium|فاخر|لوکس/i.test(message),
    modern: /modern|contemporary|عصري|مودرن|مۆدێرن/i.test(message),
    villa: /villa|فيلا|ڤیلا/i.test(message),
    availability: "available",
  };

  // Prefer personal shopping when shopping context is present but no specialist won
  let resolvedModule = consultantModule;
  if (
    consultantModule === "sales_consultant" ||
    consultantModule === "product_finder"
  ) {
    if (SHOPPING_PATTERNS.some((p) => p.test(message)) || budget.min || budget.max) {
      resolvedModule = "personal_shopping";
    }
  }

  return {
    locale,
    mode: detectMode(message, hasImage, resolvedModule),
    module: resolvedModule,
    filters,
    searchQuery: message,
    budgetMentioned: budget.min != null || budget.max != null,
    roomSize,
  };
}

export type VisualAttributes = {
  categories: string[];
  styles: string[];
  materials: string[];
  colors: string[];
  keywords: string[];
  description: string;
};

export function visualAttributesToFilters(
  attrs: VisualAttributes,
): SearchFilters {
  return {
    categories: attrs.categories.length ? attrs.categories : undefined,
    styles: attrs.styles.length ? attrs.styles : undefined,
    materials: attrs.materials.length ? attrs.materials : undefined,
    colors: attrs.colors.length ? attrs.colors : undefined,
    keywords: attrs.keywords.length ? attrs.keywords : undefined,
    availability: "available",
  };
}

export function buildSearchQueryFromVisual(attrs: VisualAttributes): string {
  return [
    attrs.description,
    ...attrs.categories,
    ...attrs.styles,
    ...attrs.materials,
    ...attrs.colors,
    ...attrs.keywords,
  ]
    .filter(Boolean)
    .join(" ");
}
