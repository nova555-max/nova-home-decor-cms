"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import {
  categoryName,
  productName,
  type Category,
  type Product,
} from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { localized } from "@/lib/i18n";
import { LuxuryButton } from "@/components/public/showroom/luxury-button";
import { cn } from "@/lib/utils";

type ProductQuickViewProps = {
  product: Product | null;
  categories: Category[];
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MediaItem =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string };

export function ProductQuickView({
  product,
  categories,
  locale,
  open,
  onOpenChange,
}: ProductQuickViewProps) {
  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!product) return [];
    const images = (
      product.images?.length
        ? product.images
        : product.image_url
          ? [product.image_url]
          : []
    ).filter(Boolean);
    const items: MediaItem[] = images.map((url) => ({ kind: "image", url }));
    if (product.video_url) {
      items.push({ kind: "video", url: product.video_url });
    }
    return items;
  }, [product]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id, open]);

  if (!product) return null;

  const category = categories.find((c) => c.id === product.category_id);
  const description = localized(
    product.description_i18n,
    locale,
    product.description ?? "",
  );
  const active = mediaItems[activeIndex] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[20px] border-border p-0 sm:max-w-2xl">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="flex flex-col gap-2 p-3 md:p-4">
            <div className="relative aspect-square overflow-hidden rounded-[16px] bg-muted">
              {active?.kind === "video" ? (
                <video
                  key={active.url}
                  src={active.url}
                  controls
                  playsInline
                  className="absolute inset-0 size-full object-cover"
                />
              ) : active?.kind === "image" ? (
                <Image
                  src={active.url}
                  alt={productName(product, locale)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[var(--gold)]/20" />
              )}
            </div>
            {mediaItems.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.kind}-${item.url}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "relative size-14 shrink-0 overflow-hidden rounded-lg border transition",
                      index === activeIndex
                        ? "border-[var(--gold)] ring-1 ring-[var(--gold)]"
                        : "border-border opacity-80 hover:opacity-100",
                    )}
                  >
                    {item.kind === "video" ? (
                      <video
                        src={item.url}
                        muted
                        playsInline
                        className="size-full object-cover"
                      />
                    ) : (
                      <Image
                        src={item.url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 p-6">
            <DialogHeader>
              {category ? (
                <p className="text-showroom-accent text-xs tracking-[0.28em] uppercase">
                  {categoryName(category, locale)}
                </p>
              ) : null}
              <DialogTitle className="font-display text-2xl font-medium tracking-tight">
                {productName(product, locale)}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-base leading-relaxed">
                  {description}
                </DialogDescription>
              ) : null}
            </DialogHeader>

            <div className="mt-auto flex gap-3 pt-4">
              <LuxuryButton
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {t(locale, "common", "view")}
              </LuxuryButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
