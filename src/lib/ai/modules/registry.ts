import type { Locale } from "@/config/site";
import type { AiConsultantModule } from "@/lib/ai/search/types";

export type ModuleDefinition = {
  id: AiConsultantModule;
  /** Regex patterns (any match triggers module) */
  patterns: RegExp[];
  /** Category filter hints for search */
  categoryHints?: string[];
  prompt: string;
};

const CONSULTANT_BASE = `You are a senior Nova Home Decor showroom consultant — never a generic chatbot.
Speak with warmth, confidence, and luxury retail expertise. Guide the customer like an in-person visit to our Erbil showroom.`;

export const AI_MODULES: ModuleDefinition[] = [
  {
    id: "product_finder",
    patterns: [/find|search|show me|looking for|product|بەرهەم|منتج|دۆز|گەڕ|أبحث/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Smart Product Finder — search the CMS catalog by name, category, style, material, color and keywords. Present only matching catalog items with clear reasons.`,
  },
  {
    id: "personal_shopping",
    patterns: [/budget|house|room|apartment|villa|style|help me choose|هەڵبژارد|بودج|غرفة|ژوور|ڤیلا/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Personal Shopping Assistant — ask clarifying questions (budget, house type, room, style, material, color) if missing, then recommend ONLY catalog products that fit.`,
  },
  {
    id: "interior_designer",
    patterns: [/design|interior|decorate|layout|plan|دیزاین|تصميم|نەخش|ديكور/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Interior Designer — create a cohesive room/home plan using ONLY Nova catalog products: doors, windows, kitchen, lighting, marble, decor.`,
  },
  {
    id: "visual_search",
    patterns: [/image|photo|picture|upload|similar|like this|وێنە|صورة|شبیه/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Visual Search — match uploaded image attributes to catalog products. Explain visual similarities honestly.`,
  },
  {
    id: "similar_products",
    patterns: [/similar|like this|same style|match|شبیه|هاوشێو|مشابه/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Similar Products — show visually and functionally similar items from the catalog only.`,
  },
  {
    id: "alternative_products",
    patterns: [/alternative|instead|unavailable|other option|بدیل|بديل|جێگرەوە/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Alternative Products — if the exact item is unavailable, recommend the closest catalog alternatives and explain trade-offs.`,
  },
  {
    id: "smart_compare",
    patterns: [/compare|vs|versus|difference|which is better|بەراورد|مقارنة|compare/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Smart Compare — compare catalog products by material, quality, price, style, color, advantages and disadvantages. Use only CMS data.`,
  },
  {
    id: "budget_planner",
    patterns: [/budget|package|afford|under \$|under \d|بودج|ميزانية|بودجێت/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Budget Planner — build the best value package within the stated budget using ONLY catalog products with prices.`,
  },
  {
    id: "room_planner",
    patterns: [/room size|sqm|m2|m²|square meter|room|ژوور|غرفة|متر/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Room Planner — recommend suitably sized products for the room dimensions and type.`,
  },
  {
    id: "material_advisor",
    patterns: [/material|wood|marble|glass|aluminum|metal|مادة|مادە|چێن/i],
    categoryHints: ["marble", "door", "window"],
    prompt: `${CONSULTANT_BASE}\nMODULE: Material Advisor — recommend the best material for the use case from catalog options only.`,
  },
  {
    id: "color_advisor",
    patterns: [/color|colour|match|palette|tone|ڕەنگ|لون/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Color Advisor — suggest harmonious colors and matching catalog products.`,
  },
  {
    id: "lighting_advisor",
    patterns: [/light|lighting|lamp|chandelier|ڕووناک|إضاءة/i],
    categoryHints: ["lighting"],
    prompt: `${CONSULTANT_BASE}\nMODULE: Lighting Advisor — recommend suitable lighting from the catalog for the space and mood.`,
  },
  {
    id: "door_advisor",
    patterns: [/door|doors|دەگا|باب|أبواب/i],
    categoryHints: ["door"],
    prompt: `${CONSULTANT_BASE}\nMODULE: Door Advisor — recommend doors from the catalog by style, material and application (villa, apartment, interior).`,
  },
  {
    id: "window_advisor",
    patterns: [/window|windows|پەنجەر|نافذ|نوافذ/i],
    categoryHints: ["window"],
    prompt: `${CONSULTANT_BASE}\nMODULE: Window Advisor — recommend windows from the catalog for ventilation, light and aesthetics.`,
  },
  {
    id: "kitchen_advisor",
    patterns: [/kitchen|cabinet|counter|مطبخ|چێشتخان/i],
    categoryHints: ["kitchen"],
    prompt: `${CONSULTANT_BASE}\nMODULE: Kitchen Advisor — recommend kitchen solutions from the catalog with layout and material guidance.`,
  },
  {
    id: "marble_advisor",
    patterns: [/marble|stone|granite|travertine|مەرمەر|رخام/i],
    categoryHints: ["marble"],
    prompt: `${CONSULTANT_BASE}\nMODULE: Marble Advisor — recommend marble and stone products from the catalog for floors, walls and surfaces.`,
  },
  {
    id: "style_detector",
    patterns: [/style|modern|classic|minimal|luxury|industrial|scandinavian|مۆدێرن|كلاسيك|فاخر/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Style Detector — identify style (Modern, Classic, Minimal, Luxury, Industrial, Scandinavian) and recommend matching catalog products.`,
  },
  {
    id: "quote_generator",
    patterns: [/quote|quotation|estimate|price list|عرض|نرخ|پێشنیار/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Quote Generator — prepare a professional quotation outline with catalog products, quantities placeholders and prices. Invite customer to showroom for formal PDF quote.`,
  },
  {
    id: "pdf_catalog",
    patterns: [/pdf|catalog|brochure|کاتالۆگ|كتalog/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Catalog Assistant — answer using catalog product and project information only. If PDF catalogs are not in CMS, direct to showroom contact.`,
  },
  {
    id: "project_advisor",
    patterns: [/project|portfolio|completed|work|پڕۆژ|مشروع/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Project Advisor — showcase relevant completed projects and link similar catalog products used.`,
  },
  {
    id: "sales_consultant",
    patterns: [/recommend|suggest|best|advice|help|پیشنیار|اقترح/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Sales Consultant — behave like an experienced showroom salesperson. Prioritize Nova products, upsell tastefully, never generic ChatGPT answers.`,
  },
  {
    id: "follow_up",
    patterns: [/what else|next|also|more|هەرو|أيض|زیاتر/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Follow-up — suggest logical next products or categories to explore from the catalog.`,
  },
  {
    id: "cross_sell",
    patterns: [/goes with|complement|complete the look|accessories|تكمل|تەواو/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Cross-sell — recommend complementary catalog products that pair with the customer's selection.`,
  },
  {
    id: "upsell",
    patterns: [/premium|upgrade|better|luxury|higher|فاخر|لوکس|premium/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Upsell — suggest premium catalog alternatives with clear value justification. Never push beyond catalog.`,
  },
  {
    id: "maintenance_advisor",
    patterns: [/maintain|clean|care|how to clean|maint|چۆن|تنظيف|صيانة/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Maintenance Advisor — explain care for materials in catalog products. General care tips OK; product links must be CMS only.`,
  },
  {
    id: "warranty_assistant",
    patterns: [/warranty|guarantee|ضمان|گەرەنتی/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Warranty Assistant — answer warranty questions. If not in CMS, direct customer to showroom phone/WhatsApp for official warranty terms.`,
  },
  {
    id: "favorites_analysis",
    patterns: [/wishlist|favorite|saved|favourites|دڵخواز/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Favorites Analysis — analyze saved/wishlist interests and recommend similar catalog products.`,
  },
  {
    id: "customer_profile",
    patterns: [/my preference|remember|profile|taste|style preference/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Customer Profile — infer preferences from conversation history and improve recommendations over time. Only catalog products.`,
  },
  {
    id: "dream_home_planner",
    patterns: [/dream home|full home|whole house|entire|complete home|ماڵ|منزل كامل/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Dream Home Planner — create a complete home decoration plan using ONLY Nova Home Decor catalog products across all rooms.`,
  },
  {
    id: "voice_assistant",
    patterns: [/voice|speak|listen|گوێ|صوت/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Voice Assistant — keep responses concise and natural for speech. Catalog products only.`,
  },
  {
    id: "image_understanding",
    patterns: [/analyze|describe|what is in|what do you see/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Image Understanding — describe the uploaded image and match to catalog products.`,
  },
  {
    id: "seo_generator",
    patterns: [/seo|meta|keywords|title tag/i],
    prompt: `Admin SEO task — generate SEO title, meta description and keywords for Nova Home Decor content.`,
  },
  {
    id: "translation",
    patterns: [/translate|ترجم|وەرگێڕ/i],
    prompt: `Translation task for Nova Home Decor content in Kurdish, Arabic and English.`,
  },
  {
    id: "smart_notifications",
    patterns: [/new arrival|notify|alert|new product/i],
    prompt: `${CONSULTANT_BASE}\nMODULE: Notifications — highlight new or featured catalog items relevant to customer interests.`,
  },
  {
    id: "conversation_history",
    patterns: [],
    prompt: `${CONSULTANT_BASE}\nUse full conversation context. Remember prior messages in this chat when recommending.`,
  },
];

export const DEFAULT_MODULE: AiConsultantModule = "sales_consultant";

export function getModuleDefinition(
  id: AiConsultantModule,
): ModuleDefinition {
  return AI_MODULES.find((m) => m.id === id) ?? AI_MODULES.find((m) => m.id === DEFAULT_MODULE)!;
}

const MODULE_LABELS: Record<AiConsultantModule, Record<Locale, string>> = {
  product_finder: { ku: "دۆزەرەوەی بەرهەم", ar: "الباحث الذكي", en: "Product Finder" },
  personal_shopping: { ku: "یاریدەدەری کڕین", ar: "مساعد التسوق", en: "Personal Shopping" },
  interior_designer: { ku: "دیزاینەری ناوەوە", ar: "مصمم داخلي", en: "Interior Designer" },
  visual_search: { ku: "گەڕانی وێنەیی", ar: "بحث بصري", en: "Visual Search" },
  similar_products: { ku: "بەرهەمی هاوشێوە", ar: "منتجات مشابهة", en: "Similar Products" },
  alternative_products: { ku: "بەدیلەکان", ar: "بدائل", en: "Alternatives" },
  smart_compare: { ku: "بەراورد", ar: "مقارنة", en: "Smart Compare" },
  budget_planner: { ku: "پلانی بودجە", ar: "مخطط الميزانية", en: "Budget Planner" },
  room_planner: { ku: "پلانی ژوور", ar: "مخطط الغرفة", en: "Room Planner" },
  material_advisor: { ku: "ڕاوێژکاری مادە", ar: "مستشار المواد", en: "Material Advisor" },
  color_advisor: { ku: "ڕاوێژکاری ڕەنگ", ar: "مستشار الألوان", en: "Color Advisor" },
  lighting_advisor: { ku: "ڕاوێژکاری ڕووناکی", ar: "مستشار الإضاءة", en: "Lighting Advisor" },
  door_advisor: { ku: "ڕاوێژکاری دەگا", ar: "مستشار الأبواب", en: "Door Advisor" },
  window_advisor: { ku: "ڕاوێژکاری پەنجەرە", ar: "مستشار النوافذ", en: "Window Advisor" },
  kitchen_advisor: { ku: "ڕاوێژکاری مطبخ", ar: "مستشار المطبخ", en: "Kitchen Advisor" },
  marble_advisor: { ku: "ڕاوێژکاری مەرمەر", ar: "مستشار الرخام", en: "Marble Advisor" },
  style_detector: { ku: "دۆزەرەوەی ستایل", ar: "كاشف الأسلوب", en: "Style Detector" },
  quote_generator: { ku: "دروستکەری نرخ", ar: "مولّد عرض السعر", en: "Quote Generator" },
  pdf_catalog: { ku: "کاتالۆگ", ar: "الكتالوج", en: "Catalog Assistant" },
  project_advisor: { ku: "ڕاوێژکاری پڕۆژە", ar: "مستشار المشاريع", en: "Project Advisor" },
  sales_consultant: { ku: "ڕاوێژکاری فرۆشتن", ar: "مستشار المبيعات", en: "Sales Consultant" },
  follow_up: { ku: "پێشنیاری دواتر", ar: "اقتراحات لاحقة", en: "Follow-up" },
  cross_sell: { ku: "تەواوکەرەکان", ar: "منتجات مكملة", en: "Cross-Sell" },
  upsell: { ku: "هەڵبژاردەی پریمیۆم", ar: "ترقية فاخرة", en: "Upsell" },
  maintenance_advisor: { ku: "چاککردنەوە", ar: "الصيانة", en: "Maintenance" },
  warranty_assistant: { ku: "گەرەنتی", ar: "الضمان", en: "Warranty" },
  favorites_analysis: { ku: "شیکاری دڵخواز", ar: "تحليل المفضلة", en: "Favorites" },
  customer_profile: { ku: "پرۆفایلی کڕیار", ar: "ملف العميل", en: "Customer Profile" },
  dream_home_planner: { ku: "پلانی ماڵی خەون", ar: "منزل الأحلام", en: "Dream Home" },
  voice_assistant: { ku: "یاریدەدەری دەنگی", ar: "المساعد الصوتي", en: "Voice Assistant" },
  image_understanding: { ku: "تێگەیشتنی وێنە", ar: "فهم الصورة", en: "Image Understanding" },
  seo_generator: { ku: "SEO", ar: "SEO", en: "SEO Generator" },
  translation: { ku: "وەرگێڕان", ar: "ترجمة", en: "Translation" },
  smart_notifications: { ku: "ئاگاداری", ar: "إشعارات", en: "Notifications" },
  conversation_history: { ku: "مێژووی گفتوگۆ", ar: "سجل المحادثة", en: "History" },
};

export function getModuleLabel(
  id: AiConsultantModule | string | undefined,
  locale: Locale,
): string {
  if (!id) return MODULE_LABELS.sales_consultant[locale];
  const entry = MODULE_LABELS[id as AiConsultantModule];
  return entry?.[locale] ?? MODULE_LABELS.sales_consultant[locale];
}
