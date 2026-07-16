/** Interior-design vocabulary for text-based attribute matching in CMS content. */

export const CATEGORY_ALIASES: Record<string, string[]> = {
  door: ["door", "doors", "دەگا", "باب", "أبواب", "باب"],
  window: ["window", "windows", "پەنجەرە", "نافذة", "نوافذ"],
  kitchen: ["kitchen", "kitchens", "مطبخ", "مطابخ", "چێشتخانە"],
  lighting: ["light", "lighting", "lights", "lamp", "إضاءة", "مصابيح", "ڕووناکی"],
  marble: ["marble", "stone", "رخام", "مەرمەر", "granite"],
  decor: ["decor", "decoration", "interior", "ديكور", "دیکۆر", "home decor"],
  tv: ["tv", "television", "تلفزيون", "تەلەفزیۆن"],
};

export const STYLE_KEYWORDS = [
  "modern",
  "contemporary",
  "classic",
  "luxury",
  "minimal",
  "minimalist",
  "traditional",
  "villa",
  "showroom",
  "عصري",
  "فاخر",
  "كلاسيك",
  "مودرن",
  "لوکس",
  "مۆدێرن",
  "کلاسیک",
];

export const MATERIAL_KEYWORDS = [
  "wood",
  "oak",
  "walnut",
  "marble",
  "glass",
  "aluminum",
  "aluminium",
  "steel",
  "brass",
  "leather",
  "خشب",
  "رخام",
  "زجاج",
  "ألومنيوم",
  "دار",
  "مەرمەر",
  "شووشە",
];

export const COLOR_KEYWORDS = [
  "white",
  "black",
  "gold",
  "silver",
  "beige",
  "brown",
  "grey",
  "gray",
  "cream",
  "olive",
  "green",
  "blue",
  "أبيض",
  "أسود",
  "ذهبي",
  "بيج",
  "سپین",
  "ڕەش",
  "زەرد",
];

export const FINISH_KEYWORDS = [
  "matte",
  "glossy",
  "polished",
  "brushed",
  "satin",
  "لامع",
  "مطفي",
  "براق",
];

export const SIZE_KEYWORDS = [
  "large",
  "small",
  "wide",
  "tall",
  "double",
  "single",
  "كبير",
  "صغير",
  "گەورە",
  "بچووک",
];

export const PROJECT_TYPE_KEYWORDS: Record<string, string[]> = {
  villa: ["villa", "فيلا", "ڤیلا", "mansion"],
  apartment: ["apartment", "flat", "شقة", "شقق", "شوقە"],
  office: ["office", "commercial", "مكتب", "تجاري", "ئۆفیس"],
  kitchen: ["kitchen", "مطبخ", "چێشتخانە"],
  bathroom: ["bathroom", "حمام", "حەمام"],
  living: ["living room", "salon", "صالة", "هۆڵی دانیشتن"],
};

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(" ").filter((t) => t.length > 1);
}

export function extractMatches(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text);
  return keywords.filter((kw) => normalized.includes(normalizeText(kw)));
}
