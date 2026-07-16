import type { Locale } from "@/config/site";
import {
  categoryName,
  productName,
  projectTitle,
  type Category,
  type GalleryItem,
  type Product,
  type Project,
} from "@/types/database";
import { localized } from "@/lib/i18n";
import {
  CATEGORY_ALIASES,
  COLOR_KEYWORDS,
  FINISH_KEYWORDS,
  MATERIAL_KEYWORDS,
  SIZE_KEYWORDS,
  STYLE_KEYWORDS,
  extractMatches,
  normalizeText,
  tokenize,
} from "@/lib/ai/search/keywords";
import type { SearchFilters } from "@/lib/ai/search/types";

export type Scored<T> = T & { score: number; matchReasons: string[] };

function productSearchText(product: Product): string {
  const parts = [
    product.name,
    product.slug,
    product.description,
    product.seo_title,
    product.seo_description,
    product.sku,
    product.name_i18n?.ku,
    product.name_i18n?.ar,
    product.name_i18n?.en,
    product.description_i18n?.ku,
    product.description_i18n?.ar,
    product.description_i18n?.en,
    product.category?.name,
    product.category?.slug,
    product.category?.description,
    product.category?.name_i18n?.ku,
    product.category?.name_i18n?.ar,
    product.category?.name_i18n?.en,
  ];
  return normalizeText(parts.filter(Boolean).join(" "));
}

function categorySearchText(category: Category): string {
  return normalizeText(
    [
      category.name,
      category.slug,
      category.description,
      category.name_i18n?.ku,
      category.name_i18n?.ar,
      category.name_i18n?.en,
      category.description_i18n?.ku,
      category.description_i18n?.ar,
      category.description_i18n?.en,
      category.color,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function projectSearchText(project: Project): string {
  return normalizeText(
    [
      project.title,
      project.slug,
      project.description,
      project.location,
      project.client_name,
      project.title_i18n?.ku,
      project.title_i18n?.ar,
      project.title_i18n?.en,
      project.description_i18n?.ku,
      project.description_i18n?.ar,
      project.description_i18n?.en,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function gallerySearchText(item: GalleryItem): string {
  return normalizeText(
    [
      item.title,
      item.caption,
      item.title_i18n?.ku,
      item.title_i18n?.ar,
      item.title_i18n?.en,
      item.caption_i18n?.ku,
      item.caption_i18n?.ar,
      item.caption_i18n?.en,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function scoreTextMatch(
  haystack: string,
  queryTokens: string[],
  filters: SearchFilters,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += token.length > 4 ? 12 : 8;
      reasons.push(`keyword:${token}`);
    }
  }

  for (const [catKey, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (filters.categories?.includes(catKey)) {
      for (const alias of aliases) {
        if (haystack.includes(normalizeText(alias))) {
          score += 20;
          reasons.push(`category:${catKey}`);
          break;
        }
      }
    }
  }

  for (const style of filters.styles ?? []) {
    if (haystack.includes(normalizeText(style))) {
      score += 14;
      reasons.push(`style:${style}`);
    }
  }

  for (const material of filters.materials ?? []) {
    if (haystack.includes(normalizeText(material))) {
      score += 14;
      reasons.push(`material:${material}`);
    }
  }

  for (const color of filters.colors ?? []) {
    if (haystack.includes(normalizeText(color))) {
      score += 12;
      reasons.push(`color:${color}`);
    }
  }

  for (const brand of filters.brands ?? []) {
    if (haystack.includes(normalizeText(brand))) {
      score += 16;
      reasons.push(`brand:${brand}`);
    }
  }

  for (const tag of filters.tags ?? []) {
    if (haystack.includes(normalizeText(tag))) {
      score += 10;
      reasons.push(`tag:${tag}`);
    }
  }

  if (filters.luxury) {
    for (const kw of ["luxury", "premium", "فاخر", "لوکس"]) {
      if (haystack.includes(normalizeText(kw))) {
        score += 10;
        reasons.push("luxury");
        break;
      }
    }
  }

  if (filters.modern) {
    for (const kw of ["modern", "contemporary", "عصري", "مودرن", "مۆدێرن"]) {
      if (haystack.includes(normalizeText(kw))) {
        score += 10;
        reasons.push("modern");
        break;
      }
    }
  }

  if (filters.villa) {
    for (const kw of ["villa", "فيلا", "ڤیلا"]) {
      if (haystack.includes(normalizeText(kw))) {
        score += 10;
        reasons.push("villa");
        break;
      }
    }
  }

  return { score, reasons: [...new Set(reasons)] };
}

export function scoreProduct(
  product: Product,
  locale: Locale,
  query: string,
  filters: SearchFilters,
): Scored<Product> {
  const haystack = productSearchText(product);
  const queryTokens = tokenize(query);
  const { score: textScore, reasons } = scoreTextMatch(
    haystack,
    queryTokens,
    filters,
  );

  let score = textScore;
  const matchReasons = [...reasons];

  if (product.is_featured) {
    score += 4;
    matchReasons.push("featured");
  }

  if (product.price != null) {
    if (filters.budgetMin != null && product.price >= filters.budgetMin) {
      score += 3;
      matchReasons.push("budget_min");
    }
    if (filters.budgetMax != null && product.price <= filters.budgetMax) {
      score += 6;
      matchReasons.push("budget_max");
    }
    if (
      filters.budgetMin != null &&
      filters.budgetMax != null &&
      product.price >= filters.budgetMin &&
      product.price <= filters.budgetMax
    ) {
      score += 10;
      matchReasons.push("in_budget");
    }
  }

  const attrs = extractMatches(haystack, [
    ...STYLE_KEYWORDS,
    ...MATERIAL_KEYWORDS,
    ...COLOR_KEYWORDS,
    ...FINISH_KEYWORDS,
    ...SIZE_KEYWORDS,
  ]);
  for (const attr of attrs) {
    if (queryTokens.some((t) => normalizeText(attr).includes(t) || t.includes(normalizeText(attr)))) {
      score += 5;
      matchReasons.push(`attr:${attr}`);
    }
  }

  return { ...product, score, matchReasons: [...new Set(matchReasons)] };
}

export function scoreCategory(
  category: Category,
  locale: Locale,
  query: string,
  filters: SearchFilters,
): Scored<Category> {
  const haystack = categorySearchText(category);
  const { score, reasons } = scoreTextMatch(haystack, tokenize(query), filters);
  return { ...category, score, matchReasons: reasons };
}

export function scoreProject(
  project: Project,
  locale: Locale,
  query: string,
  filters: SearchFilters,
): Scored<Project> {
  const haystack = projectSearchText(project);
  const { score, reasons } = scoreTextMatch(haystack, tokenize(query), filters);
  let finalScore = score;
  const matchReasons = [...reasons];

  if (project.is_featured) {
    finalScore += 3;
    matchReasons.push("featured");
  }

  if (filters.projectType && haystack.includes(normalizeText(filters.projectType))) {
    finalScore += 12;
    matchReasons.push(`project:${filters.projectType}`);
  }

  return { ...project, score: finalScore, matchReasons };
}

export function scoreGallery(
  item: GalleryItem,
  locale: Locale,
  query: string,
  filters: SearchFilters,
): Scored<GalleryItem> {
  const haystack = gallerySearchText(item);
  const { score, reasons } = scoreTextMatch(haystack, tokenize(query), filters);
  return { ...item, score, matchReasons: reasons };
}

export function toProductCard(
  product: Scored<Product>,
  locale: Locale,
): import("@/lib/ai/search/types").CmsProductCard {
  const cat = product.category;
  const desc = localized(product.description_i18n, locale, product.description ?? "");
  return {
    id: product.id,
    name: productName(product, locale),
    slug: product.slug,
    category: cat ? categoryName(cat, locale) : null,
    price: product.price,
    imageUrl: product.images?.[0] ?? product.image_url,
    description: desc ? desc.slice(0, 200) : null,
    matchReasons: product.matchReasons,
    score: product.score,
  };
}

export function toProjectMatch(
  project: Scored<Project>,
  locale: Locale,
): import("@/lib/ai/search/types").CmsProjectMatch {
  return {
    id: project.id,
    title: projectTitle(project, locale),
    location: project.location,
    description: localized(
      project.description_i18n,
      locale,
      project.description ?? "",
    )?.slice(0, 200) ?? null,
    imageUrl: project.cover_image ?? project.images?.[0] ?? null,
    score: project.score,
  };
}

export function toGalleryMatch(
  item: Scored<GalleryItem>,
  locale: Locale,
): import("@/lib/ai/search/types").CmsGalleryMatch {
  return {
    id: item.id,
    title: localized(item.title_i18n, locale, item.title ?? "Gallery"),
    caption: localized(item.caption_i18n, locale, item.caption ?? "") || null,
    imageUrl: item.image_url,
    score: item.score,
  };
}

export function toCategoryMatch(
  category: Scored<Category>,
  locale: Locale,
): import("@/lib/ai/search/types").CmsCategoryMatch {
  return {
    id: category.id,
    name: categoryName(category, locale),
    slug: category.slug,
    description: localized(
      category.description_i18n,
      locale,
      category.description ?? "",
    )?.slice(0, 160) ?? null,
    score: category.score,
  };
}
