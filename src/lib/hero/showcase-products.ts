import type { Product } from "@/types/database";

const MAX_SHOWCASE = 8;
const MIN_SHOWCASE = 1;

function hasProductImage(product: Product): boolean {
  return Boolean(product.images?.[0] || product.image_url);
}

function isActiveProduct(product: Product): boolean {
  return product.is_active && !product.deleted_at;
}

function bySortOrder(a: Product, b: Product): number {
  return a.sort_order - b.sort_order;
}

function byLatest(a: Product, b: Product): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function getProductImageUrl(product: Product): string | null {
  return product.images?.[0] ?? product.image_url ?? null;
}

/** Active CMS products with images — featured first, then catalog order. */
export function resolveHeroShowcaseProducts(products: Product[]): Product[] {
  const active = products.filter(isActiveProduct);

  const withImages = active.filter(hasProductImage);
  const featured = withImages.filter((p) => p.is_featured).sort(bySortOrder);
  if (featured.length >= MIN_SHOWCASE) {
    return featured.slice(0, MAX_SHOWCASE);
  }

  const catalog = [...withImages].sort(bySortOrder);
  if (catalog.length >= MIN_SHOWCASE) {
    return catalog.slice(0, MAX_SHOWCASE);
  }

  const latestFeatured = active
    .filter((p) => p.is_featured && hasProductImage(p))
    .sort(byLatest);
  if (latestFeatured.length) {
    return latestFeatured.slice(0, MAX_SHOWCASE);
  }

  const latest = active.filter(hasProductImage).sort(byLatest);
  return latest.slice(0, MAX_SHOWCASE);
}

export const HERO_GALLERY_ROTATE_MS = 7000;

export function heroGalleryIntervalMs(): number {
  return HERO_GALLERY_ROTATE_MS;
}
