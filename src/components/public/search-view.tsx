"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";
import {
  categoryName,
  productName,
  type Category,
  type Product,
  type WebsiteSettings,
} from "@/types/database";
import { ProductCard } from "@/components/public/showroom/product-card";
import { SiteHeader } from "@/components/public/site-header";
import { ShowroomTheme } from "@/components/public/showroom-theme";
import { Input } from "@/components/ui/input";

type SearchViewProps = {
  settings: WebsiteSettings | null;
  products: Product[];
  categories: Category[];
};

export function SearchView({
  settings,
  products,
  categories,
}: SearchViewProps) {
  const { locale, direction } = useDirection();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const matchedProducts = useMemo(() => {
    if (!q) return [];
    return products.filter((p) => {
      const name = productName(p, locale).toLowerCase();
      return name.includes(q);
    });
  }, [locale, products, q]);

  const matchedCategories = useMemo(() => {
    if (!q) return [];
    return categories.filter((c) =>
      categoryName(c, locale).toLowerCase().includes(q),
    );
  }, [categories, locale, q]);

  return (
    <div data-showroom className="bg-background text-foreground min-h-svh pb-24 md:pb-8">
      <ShowroomTheme settings={settings} />
      <SiteHeader settings={settings} locale={locale} direction={direction} />
      <main className="mx-auto max-w-[1400px] px-5 pt-28 md:px-10 lg:px-14">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t(locale, "common", "home")}
        </Link>
        <h1 className="font-display mb-2 flex items-center gap-2 text-3xl tracking-tight">
          <Search className="size-7 text-[var(--gold)]" />
          {t(locale, "search_page", "title")}
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {t(locale, "search_page", "subtitle")}
        </p>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "search_page", "placeholder")}
          dir={direction}
          autoFocus
          className="mb-8 h-12 rounded-2xl text-base md:max-w-xl"
        />

        {!q ? null : matchedProducts.length === 0 && matchedCategories.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">
            {t(locale, "search_page", "no_results")}
          </p>
        ) : (
          <div className="space-y-10">
            {matchedCategories.length ? (
              <section>
                <h2 className="mb-4 text-lg font-medium">
                  {t(locale, "search_page", "categories")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {matchedCategories.map((c) => (
                    <Link
                      key={c.id}
                      href="/#categories"
                      className="border-border bg-card hover:border-[var(--gold)] inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition"
                    >
                      {categoryName(c, locale)}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {matchedProducts.length ? (
              <section>
                <h2 className="mb-4 text-lg font-medium">
                  {t(locale, "search_page", "products")}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {matchedProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      locale={locale}
                      categories={categories}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
