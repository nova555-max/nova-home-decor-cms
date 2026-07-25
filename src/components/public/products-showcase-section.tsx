"use client";

import { useMemo } from "react";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { getSectionHeading } from "@/lib/showroom/content";
import type { Category, HomepageContent, Product } from "@/types/database";
import { CategoryFilter } from "@/components/public/category-filter";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { ProductCard } from "@/components/public/showroom/product-card";

type ProductsShowcaseSectionProps = {
  categories: Category[];
  products: Product[];
  homepage: HomepageContent | null;
  locale: Locale;
  activeCategoryId: string | null;
  browseParentId?: string | null;
  onCategoryChange: (categoryId: string | null) => void;
};

function sortProducts(items: Product[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export function ProductsShowcaseSection({
  categories,
  products,
  homepage,
  locale,
  activeCategoryId,
  browseParentId,
  onCategoryChange,
}: ProductsShowcaseSectionProps) {
  const featured = useMemo(
    () => sortProducts(products.filter((p) => p.is_featured)),
    [products],
  );

  const filteredProducts = useMemo(() => {
    // Subcategory / leaf: only that category's products.
    if (activeCategoryId) {
      return sortProducts(
        products.filter((p) => p.category_id === activeCategoryId),
      );
    }
    return sortProducts(products);
  }, [products, activeCategoryId]);

  const displayProducts =
    activeCategoryId != null
      ? filteredProducts
      : featured.length
        ? featured
        : filteredProducts.slice(0, 8);

  return (
    <section id="products" className="bg-muted/50 px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "common", "featured")}
          title={getSectionHeading(
            homepage,
            locale,
            "featured",
            t(locale, "sections", "featured"),
          )}
          subtitle={getSectionHeading(
            homepage,
            locale,
            "categories_sub",
            t(locale, "sections", "categories_sub"),
          )}
        />

        <CategoryFilter
          categories={categories}
          locale={locale}
          activeId={activeCategoryId}
          browseParentId={browseParentId}
          onSelect={onCategoryChange}
          className="mb-12"
          variant="luxury"
        />

        {displayProducts.length === 0 ? (
          <p className="text-showroom-muted rounded-[20px] border border-dashed border-border p-16 text-center text-sm">
            {t(locale, "common", "no_items")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                categories={categories}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
