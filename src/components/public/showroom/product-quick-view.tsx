"use client";

import Image from "next/image";

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

type ProductQuickViewProps = {
  product: Product | null;
  categories: Category[];
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductQuickView({
  product,
  categories,
  locale,
  open,
  onOpenChange,
}: ProductQuickViewProps) {
  if (!product) return null;

  const image = product.images?.[0] || product.image_url;
  const category = categories.find((c) => c.id === product.category_id);
  const description = localized(
    product.description_i18n,
    locale,
    product.description ?? "",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[20px] border-border p-0 sm:max-w-2xl">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-t-[20px] bg-muted md:rounded-s-[20px] md:rounded-e-none">
            {image ? (
              <Image
                src={image}
                alt={productName(product, locale)}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[var(--gold)]/20" />
            )}
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
