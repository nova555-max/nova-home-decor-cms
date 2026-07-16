"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Eye, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { categoryName, productName, type Category, type Product } from "@/types/database";
import { ProductQuickView } from "@/components/public/showroom/product-quick-view";
import { cn } from "@/lib/utils";

const FAVORITES_KEY = "nova-favorites";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

type ProductCardProps = {
  product: Product;
  locale: Locale;
  categories: Category[];
  index?: number;
  className?: string;
};

export function ProductCard({
  product,
  locale,
  categories,
  index = 0,
  className,
}: ProductCardProps) {
  const image = product.images?.[0] || product.image_url;
  const category = categories.find((c) => c.id === product.category_id);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(readFavorites().includes(product.id));
  }, [product.id]);

  const toggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const favorites = readFavorites();
      const next = favorites.includes(product.id)
        ? favorites.filter((id) => id !== product.id)
        : [...favorites, product.id];
      writeFavorites(next);
      setIsFavorite(next.includes(product.id));
      toast.success(
        t(locale, "common", next.includes(product.id) ? "favorite" : "unfavorite"),
      );
    },
    [locale, product.id],
  );

  const shareProduct = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const title = productName(product, locale);
      const url = typeof window !== "undefined" ? window.location.href : "";

      try {
        if (navigator.share) {
          await navigator.share({ title, url });
        } else {
          await navigator.clipboard.writeText(url);
          toast.success(t(locale, "common", "link_copied"));
        }
      } catch {
        toast.error(t(locale, "common", "share_failed"));
      }
    },
    [locale, product],
  );

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: 0.65,
          delay: Math.min(index * 0.06, 0.3),
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn("group showroom-card overflow-hidden bg-card", className)}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt={productName(product, locale)}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-muted" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {category ? (
            <span className="showroom-glass absolute start-4 top-4 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--gold)] uppercase">
              {categoryName(category, locale)}
            </span>
          ) : null}

          <div className="absolute end-3 top-3 flex flex-col gap-2 opacity-100 transition-all duration-300 sm:end-4 sm:top-4 sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={toggleFavorite}
              className={cn(
                "showroom-glass inline-flex size-11 items-center justify-center rounded-full border border-border transition hover:border-[var(--gold)]",
                isFavorite && "border-[var(--gold)] text-[var(--gold)]",
              )}
              aria-label={t(locale, "common", isFavorite ? "unfavorite" : "favorite")}
            >
              <Heart className={cn("size-4", isFavorite && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={shareProduct}
              className="showroom-glass inline-flex size-11 items-center justify-center rounded-full border border-border transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
              aria-label={t(locale, "common", "share")}
            >
              <Share2 className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            className="absolute inset-x-3 bottom-3 inline-flex min-h-11 translate-y-0 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--gold-foreground)] shadow-soft opacity-100 transition-all duration-500 sm:inset-x-4 sm:bottom-4 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            <Eye className="size-4" />
            {t(locale, "common", "quick_view")}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          className="flex w-full items-center justify-between gap-3 p-5 text-start transition hover:bg-muted/30 md:p-6"
        >
          <h3 className="text-base font-medium tracking-wide text-foreground md:text-lg">
            {productName(product, locale)}
          </h3>
          <span className="text-showroom-accent shrink-0 text-xs font-medium tracking-[0.2em] uppercase">
            {t(locale, "common", "view")}
          </span>
        </button>
      </motion.article>

      <ProductQuickView
        product={product}
        categories={categories}
        locale={locale}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </>
  );
}
