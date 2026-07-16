"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart } from "lucide-react";

import type { Locale } from "@/config/site";
import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";
import type { Category, Product, WebsiteSettings } from "@/types/database";
import { ProductCard } from "@/components/public/showroom/product-card";
import { SiteHeader } from "@/components/public/site-header";
import { ShowroomTheme } from "@/components/public/showroom-theme";
import { PushOptInButton } from "@/components/pwa/push-opt-in";

const FAVORITES_KEY = "nova-favorites";

type WishlistViewProps = {
  settings: WebsiteSettings | null;
  products: Product[];
  categories: Category[];
};

export function WishlistView({
  settings,
  products,
  categories,
}: WishlistViewProps) {
  const { locale, direction } = useDirection();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      setIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setIds([]);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) {
        try {
          setIds(e.newValue ? (JSON.parse(e.newValue) as string[]) : []);
        } catch {
          setIds([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saved = useMemo(() => {
    const set = new Set(ids);
    return products.filter((p) => set.has(p.id));
  }, [ids, products]);

  return (
    <div data-showroom className="bg-background text-foreground min-h-svh pb-24 md:pb-8">
      <ShowroomTheme settings={settings} />
      <SiteHeader settings={settings} locale={locale} direction={direction} />
      <main className="mx-auto max-w-[1400px] px-5 pt-28 md:px-10 lg:px-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground mb-3 inline-flex min-h-11 items-center gap-2 text-sm"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" />
              {t(locale, "common", "home")}
            </Link>
            <h1 className="font-display flex items-center gap-2 text-3xl tracking-tight">
              <Heart className="size-7 text-[var(--gold)]" />
              {t(locale as Locale, "wishlist", "title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t(locale, "wishlist", "subtitle")}
            </p>
          </div>
          <PushOptInButton />
        </div>

        {saved.length === 0 ? (
          <div className="border-border bg-card rounded-[20px] border px-6 py-16 text-center">
            <p className="text-muted-foreground mb-6">
              {t(locale, "wishlist", "empty")}
            </p>
            <Link
              href="/#products"
              className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-medium"
            >
              {t(locale, "wishlist", "browse")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {saved.map((product, index) => (
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
      </main>
    </div>
  );
}
