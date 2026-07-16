import type { Locale } from "@/config/site";
import type { Product } from "@/types/database";
import type {
  AiConsultantModule,
  CmsProductCard,
  SearchFilters,
} from "@/lib/ai/search/types";
import { toProductCard, type Scored } from "@/lib/ai/search/rank";

const COMPLEMENTARY: Record<string, string[]> = {
  door: ["window", "lighting", "decor"],
  window: ["door", "lighting", "decor"],
  kitchen: ["lighting", "marble", "decor"],
  lighting: ["door", "window", "decor"],
  marble: ["kitchen", "decor"],
  decor: ["lighting", "marble"],
};

function productMatchesCategoryHint(
  product: Scored<Product> | Product,
  hint: string,
): boolean {
  const h = hint.toLowerCase();
  const slug = product.category?.slug?.toLowerCase() ?? "";
  const name = product.category?.name?.toLowerCase() ?? "";
  const productName = product.name?.toLowerCase() ?? "";
  return slug.includes(h) || name.includes(h) || productName.includes(h);
}

function filterByCategoryHints(
  products: Scored<Product>[],
  hints: string[],
): Scored<Product>[] {
  if (!hints.length) return products;
  const filtered = products.filter((p) =>
    hints.some((h) => productMatchesCategoryHint(p, h)),
  );
  return filtered.length ? filtered : products;
}

export function applyModuleSearchStrategy(
  module: AiConsultantModule,
  scoredProducts: Scored<Product>[],
  filters: SearchFilters,
): { products: Scored<Product>[]; filters: SearchFilters } {
  let next = [...scoredProducts];
  const nextFilters = { ...filters };

  switch (module) {
    case "budget_planner":
      next.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;

    case "upsell":
      next.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;

    case "smart_compare":
      next = next.slice(0, 4);
      break;

    case "alternative_products":
      next = next.slice(0, 6);
      break;

    case "similar_products":
    case "visual_search":
    case "image_understanding":
      break;

    case "cross_sell": {
      const cats = new Set(nextFilters.categories ?? []);
      for (const cat of [...cats]) {
        for (const comp of COMPLEMENTARY[cat] ?? []) {
          cats.add(comp);
        }
      }
      nextFilters.categories = [...cats];
      break;
    }

    case "door_advisor":
      nextFilters.categories = ["door"];
      next = filterByCategoryHints(next, ["door"]);
      break;
    case "window_advisor":
      nextFilters.categories = ["window"];
      next = filterByCategoryHints(next, ["window"]);
      break;
    case "kitchen_advisor":
      nextFilters.categories = ["kitchen"];
      next = filterByCategoryHints(next, ["kitchen"]);
      break;
    case "lighting_advisor":
      nextFilters.categories = ["lighting"];
      next = filterByCategoryHints(next, ["lighting"]);
      break;
    case "marble_advisor":
      nextFilters.categories = ["marble"];
      next = filterByCategoryHints(next, ["marble"]);
      break;

    case "personal_shopping":
    case "dream_home_planner":
    case "interior_designer":
    case "room_planner":
      if (nextFilters.categories?.length) {
        next = filterByCategoryHints(next, nextFilters.categories);
      }
      break;

    case "favorites_analysis":
      break;

    default:
      break;
  }

  return { products: next, filters: nextFilters };
}

const CROSS_SELL_MODULES = new Set<AiConsultantModule>([
  "cross_sell",
  "follow_up",
  "sales_consultant",
  "personal_shopping",
  "dream_home_planner",
  "interior_designer",
  "product_finder",
]);

const UPSELL_MODULES = new Set<AiConsultantModule>([
  "upsell",
  "sales_consultant",
  "personal_shopping",
  "quote_generator",
  "dream_home_planner",
]);

export function buildCrossSellCards(
  allProducts: Product[],
  topProducts: CmsProductCard[],
  locale: Locale,
  module: AiConsultantModule,
): CmsProductCard[] {
  if (!CROSS_SELL_MODULES.has(module)) return [];
  if (!topProducts.length) return [];

  const topIds = new Set(topProducts.map((p) => p.id));
  const topCats = new Set(
    topProducts
      .map((p) => p.category?.toLowerCase())
      .filter(Boolean) as string[],
  );

  const complementary = new Set<string>();
  for (const cat of topCats) {
    for (const key of Object.keys(COMPLEMENTARY)) {
      if (cat.includes(key)) {
        for (const c of COMPLEMENTARY[key] ?? []) complementary.add(c);
      }
    }
  }

  if (!complementary.size) {
    for (const list of Object.values(COMPLEMENTARY)) {
      for (const c of list) complementary.add(c);
    }
  }

  return allProducts
    .filter((p) => !topIds.has(p.id) && p.is_active && p.status === "published")
    .filter((p) => {
      const catSlug = p.category?.slug?.toLowerCase() ?? "";
      const catName = p.category?.name?.toLowerCase() ?? "";
      return [...complementary].some(
        (c) => catSlug.includes(c) || catName.includes(c),
      );
    })
    .slice(0, 3)
    .map((p) =>
      toProductCard(
        { ...p, score: 8, matchReasons: ["cross_sell"] },
        locale,
      ),
    );
}

export function buildUpsellCards(
  allProducts: Product[],
  topProducts: CmsProductCard[],
  locale: Locale,
  module: AiConsultantModule,
): CmsProductCard[] {
  if (!UPSELL_MODULES.has(module)) return [];
  if (!topProducts.length) return [];

  const refPrice = topProducts[0]?.price ?? 0;
  const topIds = new Set(topProducts.map((p) => p.id));
  const refCategory = topProducts[0]?.category;

  return allProducts
    .filter(
      (p) =>
        !topIds.has(p.id) &&
        p.is_active &&
        p.status === "published" &&
        (p.price ?? 0) > refPrice,
    )
    .filter(
      (p) =>
        !refCategory ||
        p.category?.name === refCategory ||
        p.category?.slug === refCategory ||
        (p.category?.name?.toLowerCase().includes(
          refCategory.toLowerCase().split(" ")[0] ?? "",
        ) ??
          false),
    )
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    .slice(0, 3)
    .map((p) =>
      toProductCard({ ...p, score: 10, matchReasons: ["upsell"] }, locale),
    );
}
