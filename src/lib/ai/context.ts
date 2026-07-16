import type { Locale } from "@/config/site";
import type { ParsedIntent } from "@/lib/ai/intent";
import type { CmsSearchResult } from "@/lib/ai/search/types";

function formatProduct(p: CmsSearchResult["products"][number]): string {
  const price =
    p.price != null
      ? ` | price: ${p.price}`
      : "";
  const reasons =
    p.matchReasons.length > 0
      ? ` | match: ${p.matchReasons.join(", ")}`
      : "";
  return `- ${p.name} (id: ${p.id}, slug: ${p.slug}) | category: ${p.category ?? "—"}${price}${reasons}${p.description ? ` | ${p.description.slice(0, 120)}` : ""}`;
}

export function buildChatCmsContext(
  searchResult: CmsSearchResult,
  intent: ParsedIntent,
): string {
  const { locale, mode, module } = intent;
  const lines: string[] = [];

  lines.push(`Consultant module: ${module}`);
  lines.push(`Search mode: ${mode}`);
  lines.push(`User query: ${searchResult.query}`);
  lines.push(`Detected language: ${locale}`);

  if (searchResult.companyInfo) {
    const c = searchResult.companyInfo;
    lines.push("\nCompany:");
    lines.push(`- ${c.name}`);
    if (c.address) lines.push(`- Address: ${c.address}`);
    if (c.phone) lines.push(`- Phone: ${c.phone}`);
    if (c.whatsapp) lines.push(`- WhatsApp: ${c.whatsapp}`);
  }

  if (intent.filters.categories?.length) {
    lines.push(`\nRequested categories: ${intent.filters.categories.join(", ")}`);
  }
  if (intent.budgetMentioned) {
    const { budgetMin, budgetMax } = intent.filters;
    lines.push(
      `\nBudget filter: ${budgetMin ?? "any"} – ${budgetMax ?? "any"}`,
    );
  }
  if (intent.roomSize) {
    lines.push(`Room size mentioned: ${intent.roomSize}`);
  }

  if (searchResult.categories.length) {
    lines.push(
      "\nMatching categories:",
      ...searchResult.categories.map(
        (c) => `- ${c.name} (slug: ${c.slug})${c.description ? ` | ${c.description}` : ""}`,
      ),
    );
  }

  if (searchResult.products.length) {
    lines.push(
      `\nMatching products (${searchResult.hasExactMatch ? "exact/strong" : "closest"} matches):`,
      ...searchResult.products.map((p) => formatProduct(p)),
    );
  } else {
    lines.push("\nMatching products: NONE — do not invent products.");
  }

  if (searchResult.relatedProducts.length) {
    lines.push(
      "\nRelated / similar catalog products:",
      ...searchResult.relatedProducts.map((p) => formatProduct(p)),
    );
  }

  if (searchResult.crossSellProducts.length) {
    lines.push(
      "\nComplementary products (cross-sell):",
      ...searchResult.crossSellProducts.map((p) => formatProduct(p)),
    );
  }

  if (searchResult.upsellProducts.length) {
    lines.push(
      "\nPremium alternatives (upsell):",
      ...searchResult.upsellProducts.map((p) => formatProduct(p)),
    );
  }

  if (searchResult.projects.length) {
    lines.push(
      "\nMatching projects:",
      ...searchResult.projects.map(
        (p) =>
          `- ${p.title}${p.location ? ` (${p.location})` : ""}${p.description ? ` | ${p.description.slice(0, 100)}` : ""}`,
      ),
    );
  }

  if (searchResult.gallery.length) {
    lines.push(
      "\nMatching gallery inspiration:",
      ...searchResult.gallery.map(
        (g) => `- ${g.title}${g.caption ? ` | ${g.caption.slice(0, 80)}` : ""}`,
      ),
    );
  }

  if (searchResult.menuItems.length) {
    lines.push(
      "\nCMS menu / navigation labels:",
      ...searchResult.menuItems.map((m) => `- ${m.key}: ${m.label}`),
    );
  }

  if (searchResult.contentStrings.length) {
    lines.push(
      "\nMatching website content (CMS only):",
      ...searchResult.contentStrings.map((c) => `- ${c.key}: ${c.text}`),
    );
  }

  if (searchResult.settingsContext.length) {
    lines.push(
      "\nCMS settings context:",
      ...searchResult.settingsContext.map((s) => `- ${s}`),
    );
  }

  if (searchResult.homepageMatches.length) {
    lines.push(
      "\nMatching homepage CMS content:",
      ...searchResult.homepageMatches.map((h) => `- ${h.section}: ${h.text}`),
    );
  }

  if (searchResult.cmsUnavailableMessage) {
    lines.push(
      `\nCMS DATA STATUS: No matching CMS records for this query. You MUST reply with exactly: "${searchResult.cmsUnavailableMessage}"`,
    );
  }

  if (searchResult.alternativesMessage) {
    lines.push(`\nNote: ${searchResult.alternativesMessage}`);
  }

  lines.push(
    "\nREMINDER: Recommend ONLY products listed above. Explain WHY each product matches the user's needs.",
  );

  return lines.join("\n");
}

export function buildChatMeta(searchResult: CmsSearchResult) {
  return {
    products: searchResult.products,
    relatedProducts: searchResult.relatedProducts,
    crossSellProducts: searchResult.crossSellProducts,
    upsellProducts: searchResult.upsellProducts,
    hasExactMatch: searchResult.hasExactMatch,
    mode: searchResult.mode,
    module: searchResult.module,
    totalMatches: searchResult.totalMatches,
    companyInfo: searchResult.companyInfo,
  };
}
