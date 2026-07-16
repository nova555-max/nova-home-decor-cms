import type { Locale } from "@/config/site";
import {
  getPublicCategories,
  getPublicGallery,
  getPublicProducts,
  getPublicProjects,
  getHomepageContent,
  getWebsiteSettings,
} from "@/lib/queries/cms";
import { getPublishedContentStrings } from "@/lib/queries/content";
import {
  buildSettingsSearchContext,
  CMS_UNAVAILABLE_MESSAGE,
  hasCmsSearchHits,
  searchHomepageContent,
  searchMenuContent,
  searchPublishedContent,
  type CmsContentMatch,
  type CmsHomepageMatch,
  type CmsMenuMatch,
} from "@/lib/ai/search/cms-content";
import {
  buildCacheKey,
  getCached,
  setCached,
} from "@/lib/ai/search/cache";
import {
  scoreCategory,
  scoreGallery,
  scoreProduct,
  scoreProject,
  toCategoryMatch,
  toGalleryMatch,
  toProductCard,
  toProjectMatch,
} from "@/lib/ai/search/rank";
import {
  applyModuleSearchStrategy,
  buildCrossSellCards,
  buildUpsellCards,
} from "@/lib/ai/search/strategies";
import type {
  AiChatMode,
  AiConsultantModule,
  CmsSearchResult,
  SearchFilters,
} from "@/lib/ai/search/types";
import type { Product } from "@/types/database";

const MIN_SCORE = 6;
const MAX_PRODUCTS = 8;
const MAX_RELATED = 4;
const MAX_PROJECTS = 4;
const MAX_GALLERY = 4;
const MAX_CATEGORIES = 6;

type SearchInput = {
  query: string;
  locale: Locale;
  mode?: AiChatMode;
  module?: AiConsultantModule;
  filters?: SearchFilters;
  favoriteIds?: string[];
};

function alternativesMessage(
  locale: Locale,
  hasProducts: boolean,
  hasClose: boolean,
): string | null {
  if (hasProducts) return null;
  if (!hasClose) {
    const messages: Record<Locale, string> = {
      ku: "هیچ بەرهەمێکی تەواو لەگەڵ داواکارییەکەت نەدۆزرایەوە. دەتوانیت پەیوەندی بە شۆڕومەکەمان بکەیت بۆ ڕاوێژکردن.",
      ar: "لم نجد منتجاً مطابقاً تماماً لطلبك. يمكنك التواصل مع المعرض للحصول على استشارة.",
      en: "No exact catalog match was found. Contact our showroom for a personalized consultation.",
    };
    return messages[locale];
  }
  const messages: Record<Locale, string> = {
    ku: "هیچ هاوتایەکی تەواو نەدۆزرایەوە — ئەم بەرهەمانە نزیکترین هەڵبژاردنەکانن لە کاتالۆگەکەمان.",
    ar: "لا يوجد تطابق تام — هذه أقرب الخيارات من كتالوجنا.",
    en: "No exact match — here are the closest alternatives from our catalog.",
  };
  return messages[locale];
}

function findRelatedProducts(
  products: Product[],
  topProducts: ReturnType<typeof toProductCard>[],
  locale: Locale,
): ReturnType<typeof toProductCard>[] {
  const topIds = new Set(topProducts.map((p) => p.id));
  const relatedIds = new Set<string>();

  for (const product of products) {
    if (!topIds.has(product.id)) {
      for (const relId of product.related_product_ids ?? []) {
        if (!topIds.has(relId)) relatedIds.add(relId);
      }
    }
  }

  if (topProducts.length > 0) {
    const topCategoryIds = new Set(
      products
        .filter((p) => topIds.has(p.id))
        .map((p) => p.category_id)
        .filter(Boolean),
    );
    for (const product of products) {
      if (
        !topIds.has(product.id) &&
        product.category_id &&
        topCategoryIds.has(product.category_id)
      ) {
        relatedIds.add(product.id);
      }
    }
  }

  return products
    .filter((p) => relatedIds.has(p.id))
    .slice(0, MAX_RELATED)
    .map((p) =>
      toProductCard(
        { ...p, score: 5, matchReasons: ["related"] },
        locale,
      ),
    );
}

export async function searchCms(input: SearchInput): Promise<CmsSearchResult> {
  const {
    query,
    locale,
    mode = "general",
    module: consultantModule = "sales_consultant",
    filters = {},
    favoriteIds = [],
  } = input;
  const cacheKey = buildCacheKey({ query, locale, mode, module: consultantModule, filters, favoriteIds });
  const cached = getCached<CmsSearchResult>(cacheKey);
  if (cached) return cached;

  const [settings, categories, products, projects, gallery, contentStore, homepage] =
    await Promise.all([
      getWebsiteSettings(),
      getPublicCategories(),
      getPublicProducts(),
      getPublicProjects(),
      getPublicGallery(),
      getPublishedContentStrings(),
      getHomepageContent(),
    ]);

  const contentStrings = searchPublishedContent(contentStore, locale, query);
  const menuItems = searchMenuContent(contentStore, locale, query);
  const settingsContext = buildSettingsSearchContext(settings, locale);
  const homepageMatches = searchHomepageContent(homepage, locale, query);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const enrichedProducts = products.map((p) => ({
    ...p,
    category: p.category ?? (p.category_id ? categoryMap.get(p.category_id) ?? null : null),
  }));

  const availableProducts =
    filters.availability === "all"
      ? enrichedProducts
      : enrichedProducts.filter(
          (p) => p.is_active && p.status === "published",
        );

  let scoredProducts = availableProducts
    .map((p) => scoreProduct(p, locale, query, filters))
    .filter((p) => p.score >= (consultantModule === "alternative_products" ? 4 : MIN_SCORE))
    .sort((a, b) => b.score - a.score);

  const strategy = applyModuleSearchStrategy(consultantModule, scoredProducts, filters);
  scoredProducts = strategy.products;

  if (favoriteIds.length > 0) {
    const favSet = new Set(favoriteIds);
    const favBoost = availableProducts
      .filter((p) => favSet.has(p.id))
      .map((p) =>
        scoreProduct(
          p,
          locale,
          query || "favorites wishlist",
          { ...strategy.filters, availability: "available" },
        ),
      )
      .map((p) => ({ ...p, score: p.score + 15, matchReasons: [...p.matchReasons, "favorite"] }));
    const seen = new Set(favBoost.map((p) => p.id));
    scoredProducts = [
      ...favBoost,
      ...scoredProducts.filter((p) => !seen.has(p.id)),
    ];
  }

  if (consultantModule === "cross_sell" && strategy.filters.categories?.length) {
    const extra = availableProducts
      .map((p) => scoreProduct(p, locale, strategy.filters.categories!.join(" "), strategy.filters))
      .filter((p) => p.score >= 4)
      .sort((a, b) => b.score - a.score);
    const seen = new Set(scoredProducts.map((p) => p.id));
    scoredProducts = [
      ...scoredProducts,
      ...extra.filter((p) => !seen.has(p.id)),
    ];
  }

  const scoredCategories = categories
    .map((c) => scoreCategory(c, locale, query, filters))
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CATEGORIES);

  const scoredProjects = projects
    .map((p) => scoreProject(p, locale, query, filters))
    .filter((p) => p.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PROJECTS);

  const scoredGallery = gallery
    .map((g) => scoreGallery(g, locale, query, filters))
    .filter((g) => g.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_GALLERY);

  const productCards = scoredProducts
    .slice(0, MAX_PRODUCTS)
    .map((p) => toProductCard(p, locale));

  const relatedProducts = findRelatedProducts(
    availableProducts,
    productCards,
    locale,
  );

  const crossSellProducts = buildCrossSellCards(
    availableProducts,
    productCards,
    locale,
    consultantModule,
  );

  const upsellProducts = buildUpsellCards(
    availableProducts,
    productCards,
    locale,
    consultantModule,
  );

  const hasExactMatch = productCards.some((p) => p.score >= 20);
  const hasClose = productCards.length > 0;

  const result: CmsSearchResult = {
    query,
    locale,
    mode,
    module: consultantModule,
    hasExactMatch,
    products: productCards,
    relatedProducts,
    crossSellProducts,
    upsellProducts,
    categories: scoredCategories.map((c) => toCategoryMatch(c, locale)),
    projects: scoredProjects.map((p) => toProjectMatch(p, locale)),
    gallery: scoredGallery.map((g) => toGalleryMatch(g, locale)),
    companyInfo: settings
      ? {
          name: settings.company_name,
          address: settings.company_address,
          phone: settings.phone_number,
          whatsapp: settings.whatsapp_number,
        }
      : null,
    contentStrings,
    menuItems,
    settingsContext,
    homepageMatches,
    cmsUnavailableMessage: null,
    alternativesMessage: alternativesMessage(locale, hasExactMatch, hasClose),
    totalMatches:
      productCards.length +
      relatedProducts.length +
      crossSellProducts.length +
      upsellProducts.length +
      scoredCategories.length +
      scoredProjects.length +
      scoredGallery.length +
      contentStrings.length +
      menuItems.length +
      homepageMatches.length +
      settingsContext.length,
  };

  if (!hasCmsSearchHits(result)) {
    result.cmsUnavailableMessage = CMS_UNAVAILABLE_MESSAGE;
  }

  setCached(cacheKey, result);
  return result;
}

export async function searchCmsByProductIds(
  ids: string[],
  locale: Locale,
): Promise<CmsSearchResult> {
  const [settings, categories, products, projects, gallery] = await Promise.all([
    getWebsiteSettings(),
    getPublicCategories(),
    getPublicProducts(),
    getPublicProjects(),
    getPublicGallery(),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const idSet = new Set(ids);
  const matched = products
    .filter((p) => idSet.has(p.id) && p.is_active && p.status === "published")
    .map((p) => ({
      ...p,
      category: p.category ?? (p.category_id ? categoryMap.get(p.category_id) ?? null : null),
    }));

  const productCards = matched.map((p) =>
    toProductCard({ ...p, score: 30, matchReasons: ["visual_match"] }, locale),
  );

  return {
    query: "visual_search",
    locale,
    mode: "visual_search",
    module: "visual_search",
    hasExactMatch: productCards.length > 0,
    products: productCards,
    relatedProducts: findRelatedProducts(products, productCards, locale),
    crossSellProducts: [],
    upsellProducts: [],
    categories: [],
    projects: projects.slice(0, 2).map((p) =>
      toProjectMatch({ ...p, score: 0, matchReasons: [] }, locale),
    ),
    gallery: gallery.slice(0, 2).map((g) =>
      toGalleryMatch({ ...g, score: 0, matchReasons: [] }, locale),
    ),
    contentStrings: [],
    menuItems: [],
    settingsContext: buildSettingsSearchContext(settings, locale),
    homepageMatches: [],
    cmsUnavailableMessage: productCards.length
      ? null
      : CMS_UNAVAILABLE_MESSAGE,
    companyInfo: settings
      ? {
          name: settings.company_name,
          address: settings.company_address,
          phone: settings.phone_number,
          whatsapp: settings.whatsapp_number,
        }
      : null,
    alternativesMessage: productCards.length
      ? null
      : alternativesMessage(locale, false, false),
    totalMatches: productCards.length,
  };
}
