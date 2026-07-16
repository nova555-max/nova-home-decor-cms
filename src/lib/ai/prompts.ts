import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";
import {
  DEFAULT_MODULE,
  getModuleDefinition,
} from "@/lib/ai/modules/registry";
import type { AiChatMode, AiConsultantModule } from "@/lib/ai/search/types";
import type { AiGenerateContext, AiGenerateRequest } from "@/lib/ai/types";

const localeNames: Record<Locale, string> = {
  ku: "Kurdish (Sorani)",
  ar: "Arabic",
  en: "English",
};

function contextBlock(ctx?: AiGenerateContext): string {
  if (!ctx) return "";
  const lines = [
    ctx.entityName ? `Name/Title: ${ctx.entityName}` : null,
    ctx.categoryName ? `Category: ${ctx.categoryName}` : null,
    ctx.location ? `Location: ${ctx.location}` : null,
    ctx.clientName ? `Client: ${ctx.clientName}` : null,
    ctx.companyName ? `Company: ${ctx.companyName}` : null,
    ctx.fieldLabel ? `Field: ${ctx.fieldLabel}` : null,
    ctx.existingText ? `Existing text:\n${ctx.existingText}` : null,
  ].filter(Boolean);
  return lines.length ? `\nContext:\n${lines.join("\n")}` : "";
}

export function buildAdminPrompt(request: AiGenerateRequest): string {
  const { task, locale, sourceLocale, context } = request;
  const ctx = contextBlock(context);
  const brand =
    "Nova Home Decor — luxury showroom for doors, windows, kitchens, lighting, marble and interior decoration. Tone: premium, elegant, warm, trustworthy.";

  switch (task) {
    case "product_description":
      return `${brand}\nWrite a compelling product description for the showroom catalog.${ctx}\nReturn JSON only with keys ku, ar, en. Each value should match the language. Keep descriptions concise (2-4 sentences), marketing-focused, no prices unless provided.`;

    case "project_description":
      return `${brand}\nWrite a premium project showcase description.${ctx}\nReturn JSON only with keys ku, ar, en. Highlight craftsmanship, materials and atmosphere. 2-4 sentences per locale.`;

    case "gallery_caption":
      return `${brand}\nWrite a short gallery caption (1-2 sentences) for an interior design photo.${ctx}\nReturn JSON only with keys ku, ar, en.`;

    case "seo_title":
      return `${brand}\nWrite an SEO page title (max 60 characters per locale).${ctx}\nReturn JSON only with keys ku, ar, en.`;

    case "seo_description":
      return `${brand}\nWrite an SEO meta description (max 160 characters per locale).${ctx}\nReturn JSON only with keys ku, ar, en.`;

    case "seo_keywords":
      return `${brand}\nGenerate 8-12 SEO keywords/phrases as a comma-separated list in ${locale ? localeNames[locale] : "English"}.${ctx}\nReturn plain text only, comma-separated, no JSON.`;

    case "seo_social":
      return `${brand}\nGenerate Open Graph and Twitter card copy plus JSON-LD structured data suggestions for a luxury home decor showroom page.${ctx}\nReturn JSON only with keys:
- og_title (ku, ar, en object)
- og_description (ku, ar, en object)
- twitter_title (ku, ar, en object)
- twitter_description (ku, ar, en object)
- structured_data (object with @context, @type, name, description, url placeholders — no real URLs)`;

    case "translate": {
      const from = sourceLocale ? localeNames[sourceLocale] : "the source language";
      const targets =
        request.targetLocales?.map((l) => localeNames[l]).join(", ") ??
        siteConfig.locales.map((l) => localeNames[l]).join(", ");
      return `Translate the following text from ${from} to: ${targets}. Preserve meaning and premium tone for Nova Home Decor.${ctx}\nReturn JSON only with keys ku, ar, en for all target languages.`;
    }

    case "improve_grammar":
      return `Improve grammar, clarity and flow for Nova Home Decor content in ${locale ? localeNames[locale] : "all locales"}.${ctx}\nReturn JSON only with keys ku, ar, en. Only improve locales that have existing text; leave empty strings for missing locales.`;

    case "marketing_rewrite":
      return `${brand}\nRewrite as persuasive marketing copy that highlights benefits and craftsmanship.${ctx}\nReturn JSON only with keys ku, ar, en. 2-4 sentences per locale.`;

    case "premium_rewrite":
      return `${brand}\nRewrite as premium luxury marketing copy.${ctx}\nReturn JSON only with keys ku, ar, en. Elegant, evocative, not cheesy. 2-4 sentences per locale.`;

    case "short_version":
      return `${brand}\nCreate a short version (1 sentence, max 120 chars per locale) for cards and previews.${ctx}\nReturn JSON only with keys ku, ar, en.`;

    case "long_version":
      return `${brand}\nCreate a long detailed version (4-6 sentences per locale) for product/project pages.${ctx}\nReturn JSON only with keys ku, ar, en.`;

    default:
      return `${brand}${ctx}\nReturn helpful content.`;
  }
}

const modeInstructions: Record<AiChatMode, string> = {
  general:
    "Act as a friendly Nova showroom consultant on the floor. Warm, confident, never generic. Answer using CMS catalog data only.",
  quote_assistant:
    "Act as a quote assistant. Gather project type, room size, budget, style, materials and colors from the conversation if missing. Recommend specific catalog products with prices when available. Structure the reply like a professional quotation outline (items + prices). Invite the customer to print/save or visit the showroom for a formal quote.",
  interior_designer:
    "Act as an interior design consultant. Suggest doors, windows, lighting, kitchens, marble and decor from the CMS catalog only. Explain design rationale and how products complement each other. Ask clarifying questions when room type or style is unclear.",
  visual_search:
    "The user uploaded an image. Match visual attributes to catalog products only. Explain which CMS products best match the image and why. Never invent products not listed in CMS data.",
};

const CLARIFYING_MODULES = new Set<AiConsultantModule>([
  "personal_shopping",
  "budget_planner",
  "room_planner",
  "dream_home_planner",
  "interior_designer",
  "quote_generator",
]);

export function buildChatSystemPrompt(
  locale: Locale,
  cmsContext: string,
  mode: AiChatMode = "general",
  module: AiConsultantModule = DEFAULT_MODULE,
): string {
  const modDef = getModuleDefinition(module);
  const modeHint = modeInstructions[mode];
  const clarify = CLARIFYING_MODULES.has(module)
    ? `\nCLARIFY FIRST: If budget, room/house type, preferred style, material, or color is missing, ask 1–2 short questions BEFORE final recommendations. Still name any strong CMS matches you already have.`
    : "";

  return `${modDef.prompt}

PERSONA: You are an experienced Nova Home Decor luxury showroom consultant (doors, windows, kitchens, lighting, marble, décor). Speak like a trusted in-showroom advisor — warm, precise, premium. NEVER sound like ChatGPT, a generic chatbot, or a tech assistant. Never say "As an AI".

LANGUAGE: Reply in ${localeNames[locale]} by default. Auto-detect Kurdish (Sorani), Arabic, or English and match the customer's language.

ACTIVE MODULE: ${module}
CHAT MODE: ${modeHint}
${clarify}

STRICT CMS RULES:
- Search and ground EVERY answer in the CMS data block below ONLY.
- Use ONLY listed CMS products, prices, projects, gallery, website content, menus, settings, and company contact details.
- If no CMS data matches the user's question, reply with exactly: "This information is not available in the Nova Home Decor CMS."
- NEVER search the internet. NEVER use outside knowledge for product facts, prices, or inventory.
- NEVER invent products, SKUs, prices, brands, warranties, or services not present in CMS data.
- Prefer product names exactly as listed. Cite category and price when available.
- For color theory / layout tips, general knowledge is OK — but every product suggestion must be a CMS catalog item.
- If no exact match exists, present closest CMS alternatives and say so honestly.
- Never mention databases, APIs, Supabase, Gemini, or internal systems.
- Keep answers scannable: short paragraphs, clear next steps (visit showroom / WhatsApp / call).

${cmsContext}`;
}

export const SUGGESTED_QUESTIONS: Record<Locale, string[]> = {
  ku: [
    "دەگای لوکس بۆ ڤیلا پیشنیار بکە",
    "پەنجەرەی مۆدێرن بۆ نیشتەجێبوون",
    "ڕووناکی گونجاو بۆ هۆڵی دانیشتن",
    "نرخی دەگا و پەنجەرە چەندە؟",
    "پڕۆژەی تەواوکراو بۆ مطبخ پیشان بدە",
  ],
  ar: [
    "اقترح باباً فاخراً لفيلا",
    "نوافذ عصرية للشقة",
    "إضاءة مناسبة لغرفة المعيشة",
    "ما أسعار الأبواب والنوافذ؟",
    "اعرض مشروع مطبخ مكتمل",
  ],
  en: [
    "Suggest luxury doors for a villa",
    "Modern windows for an apartment",
    "Lighting ideas for a living room",
    "What are your door and window prices?",
    "Show me a completed kitchen project",
  ],
};
