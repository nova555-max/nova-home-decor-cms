import type { Locale } from "@/config/site";
import {
  buildSettingsSearchContext,
  CMS_EMPTY_MESSAGE,
  hasCmsSearchHits,
  isCatalogBrowseQuery,
  searchHomepageContent,
  searchMenuContent,
  searchPublishedContent,
} from "@/lib/ai/search/cms-content";
import {
  buildCacheKey,
  getCached,
  setCached,
} from "@/lib/ai/search/cache";
import {
  isCmsCatalogEmpty,
  loadCmsDataForAi,
} from "@/lib/ai/search/load-cms-data";
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
import { categoryName } from "@/types/database";

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

function buildCatalogSummary(
  locale: Locale,
  snapshot: Awaited<ReturnType<typeof loadCmsDataForAi>>,
): string[] {
  const lines: string[] = [
    `Inventory: ${snapshot.products.length} published products (${snapshot.allProducts.length} total including drafts)`,
    `Categories: ${snapshot.categories.length}`,
    `Projects: ${snapshot.projects.length}`,
    `Gallery items: ${snapshot.gallery.length}`,
  ];

  if (snapshot.categories.length) {
    lines.push(
      `Category list: ${snapshot.categories
        .map((c) => categoryName(c, locale))
        .join(", ")}`,
    );
  }

  if (snapshot.products.length === 0 && snapshot.allProducts.length === 0) {
    lines.push("Product catalog: no product records exist yet.");
  } else if (snapshot.products.length === 0) {
    lines.push(
      "Product catalog: products exist but none are published/active for the public site.",
    );
  }

  return lines;
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
  const cacheKey = buildCacheKey({
    v: 2,
    query,
    locale,
    mode,
    module: consultantModule,
    filters,
    favoriteIds,
  });
  const cached = getCached<CmsSearchResult>(cacheKey);
  if (cached) return cached;

  const snapshot = await loadCmsDataForAi();
  const {
    settings,
    categories,
    products,
    projects,
    gallery,
    contentStore,
    homepage,
  } = snapshot;

  const contentStrings = searchPublishedContent(contentStore, locale, query);
  const menuItems = searchMenuContent(contentStore, locale, query);
  const settingsContext = [
    ...buildSettingsSearchContext(settings, locale),
    ...buildCatalogSummary(locale, snapshot),
  ];
  const homepageMatches = searchHomepageContent(homepage, locale, query);

  const availableProducts =
    filters.availability === "all"
      ? snapshot.allProducts.filter((p) => p.is_active)
      : products;

  let scoredProducts = availableProducts
    .map((p) => scoreProduct(p, locale, query, filters))
    .filter((p) =>
      p.score >= (consultantModule === "alternative_products" ? 4 : MIN_SCORE),
    )
    .sort((a, b) => b.score - a.score);

  const strategy = applyModuleSearchStrategy(
    consultantModule,
    scoredProducts,
    filters,
  );
  scoredProducts = strategy.products;

  if (favoriteIds.length > 0) {
    const favSet = new Set(favoriteIds);
    const favBoost = availableProducts
      .filter((p) => favSet.has(p.id))
      .map((p) =>
        scoreProduct(p, locale, query || "favorites wishlist", {
          ...strategy.filters,
          availability: "available",
        }),
      )
      .map((p) => ({
        ...p,
        score: p.score + 15,
        matchReasons: [...p.matchReasons, "favorite"],
      }));
    const seen = new Set(favBoost.map((p) => p.id));
    scoredProducts = [
      ...favBoost,
      ...scoredProducts.filter((p) => !seen.has(p.id)),
    ];
  }

  if (consultantModule === "cross_sell" && strategy.filters.categories?.length) {
    const extra = availableProducts
      .map((p) =>
        scoreProduct(
          p,
          locale,
          strategy.filters.categories!.join(" "),
          strategy.filters,
        ),
      )
      .filter((p) => p.score >= 4)
      .sort((a, b) => b.score - a.score);
    const seen = new Set(scoredProducts.map((p) => p.id));
    scoredProducts = [
      ...scoredProducts,
      ...extra.filter((p) => !seen.has(p.id)),
    ];
  }

  let scoredCategories = categories
    .map((c) => scoreCategory(c, locale, query, filters))
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CATEGORIES);

  let scoredProjects = projects
    .map((p) => scoreProject(p, locale, query, filters))
    .filter((p) => p.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PROJECTS);

  let scoredGallery = gallery
    .map((g) => scoreGallery(g, locale, query, filters))
    .filter((g) => g.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_GALLERY);

  const browse = isCatalogBrowseQuery(query) || !query.trim();

  // When browsing / general questions, always expose real CMS inventory.
  if (browse) {
    const scoredCatIds = new Set(scoredCategories.map((c) => c.id));
    for (const c of categories) {
      if (!scoredCatIds.has(c.id)) {
        scoredCategories.push({
          ...c,
          score: 5,
          matchReasons: ["catalog"],
        });
      }
    }
    scoredCategories = scoredCategories.slice(0, MAX_CATEGORIES);

    if (scoredProducts.length === 0 && availableProducts.length > 0) {
      scoredProducts = availableProducts.slice(0, MAX_PRODUCTS).map((p) => ({
        ...p,
        score: 5,
        matchReasons: ["catalog"],
      }));
    }
    if (scoredProjects.length === 0 && projects.length > 0) {
      scoredProjects = projects.slice(0, MAX_PROJECTS).map((p) => ({
        ...p,
        score: 4,
        matchReasons: ["catalog"],
      }));
    }
    if (scoredGallery.length === 0 && gallery.length > 0) {
      scoredGallery = gallery.slice(0, MAX_GALLERY).map((g) => ({
        ...g,
        score: 4,
        matchReasons: ["catalog"],
      }));
    }
  } else if (scoredProducts.length === 0) {
    // Soft fallback: still surface catalog categories/products so the model
    // can answer from real CMS data instead of inventing or refusing.
    if (scoredCategories.length === 0 && categories.length > 0) {
      scoredCategories = categories.slice(0, MAX_CATEGORIES).map((c) => ({
        ...c,
        score: 5,
        matchReasons: ["catalog"],
      }));
    }
    if (availableProducts.length > 0) {
      scoredProducts = availableProducts.slice(0, MAX_PRODUCTS).map((p) => ({
        ...p,
        score: 5,
        matchReasons: ["catalog"],
      }));
    }
  }

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
  const catalogEmpty = isCmsCatalogEmpty(snapshot);

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
    // Never use the old "unavailable" fallback when the query succeeded.
    // Empty DB → explicit empty message. Otherwise answer from real CMS data.
    cmsUnavailableMessage: catalogEmpty ? CMS_EMPTY_MESSAGE : null,
    alternativesMessage: catalogEmpty
      ? null
      : alternativesMessage(locale, hasExactMatch, hasClose),
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

  if (!catalogEmpty && !hasCmsSearchHits(result) && !result.companyInfo) {
    // Extremely rare: settings missing but other empty — still avoid unavailable phrase.
    result.cmsUnavailableMessage = CMS_EMPTY_MESSAGE;
  }

  if (snapshot.errors.length) {
    console.warn("[ai/search] CMS load warnings:", snapshot.errors);
  }

  setCached(cacheKey, result);
  return result;
}

export async function searchCmsByProductIds(
  ids: string[],
  locale: Locale,
): Promise<CmsSearchResult> {
  const snapshot = await loadCmsDataForAi();
  const { settings, products, projects, gallery } = snapshot;

  const idSet = new Set(ids);
  const matched = products.filter((p) => idSet.has(p.id));

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
    settingsContext: [
      ...buildSettingsSearchContext(settings, locale),
      ...buildCatalogSummary(locale, snapshot),
    ],
    homepageMatches: [],
    cmsUnavailableMessage: isCmsCatalogEmpty(snapshot) ? CMS_EMPTY_MESSAGE : null,
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
