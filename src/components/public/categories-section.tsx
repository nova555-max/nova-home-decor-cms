"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { t } from "@/lib/i18n";
import { productName, type Category, type Product } from "@/types/database";
import { CategoryFilter } from "@/components/public/category-filter";
import { SmartImage } from "@/components/ui/smart-image";

type CategoriesSectionProps = {
  categories: Category[];
  products: Product[];
  locale: Locale;
  activeCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
};

function sortProducts(items: Product[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export function CategoriesSection({
  categories,
  products,
  locale,
  activeCategoryId,
  onCategoryChange,
}: CategoriesSectionProps) {
  const filteredProducts = useMemo(() => {
    const list = activeCategoryId
      ? products.filter((product) => product.category_id === activeCategoryId)
      : products;
    return sortProducts(list);
  }, [products, activeCategoryId]);

  return (
    <section id="products" className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6 md:pb-20">
      <CategoryFilter
        categories={categories}
        locale={locale}
        activeId={activeCategoryId}
        onSelect={onCategoryChange}
        className="py-8 md:py-10"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategoryId ?? "all"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <ProductGrid
            products={filteredProducts}
            locale={locale}
            empty={t(locale, "common", "no_items")}
          />
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function ProductGrid({
  products,
  locale,
  empty,
}: {
  products: Product[];
  locale: Locale;
  empty: string;
}) {
  if (!products.length) {
    return (
      <p className="text-muted-foreground rounded-2xl border border-dashed p-12 text-center text-sm">
        {empty}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
      {products.map((product, index) => (
        <motion.article
          key={product.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: Math.min(index * 0.04, 0.24),
            ease: "easeOut",
          }}
          className="group"
        >
          <div className="bg-muted relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-sm p-3 md:min-h-[320px]">
            {(product.images?.[0] || product.image_url) ? (
              <SmartImage
                src={product.images?.[0] || product.image_url!}
                alt={productName(product, locale)}
                fit="contain"
                className="max-h-[420px] max-w-full"
              />
            ) : (
              <div className="bg-foreground/5 h-full min-h-[240px] w-full rounded-sm" aria-hidden />
            )}
          </div>
          <div className="mt-3 space-y-1">
            <h3 className="text-sm font-medium tracking-wide">
              {productName(product, locale)}
            </h3>
            {product.price != null ? (
              <p className="text-muted-foreground text-sm">
                {formatPrice(product.price)}
              </p>
            ) : null}
          </div>
        </motion.article>
      ))}
    </div>
  );
}
