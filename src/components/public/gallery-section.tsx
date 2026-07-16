"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ZoomIn } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { localized, t } from "@/lib/i18n";
import type { GalleryItem, HomepageContent } from "@/types/database";
import { getSectionHeading } from "@/lib/showroom/content";
import { GalleryLightbox } from "@/components/public/showroom/gallery-lightbox";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { cn } from "@/lib/utils";

type GallerySectionProps = {
  items: GalleryItem[];
  homepage: HomepageContent | null;
  locale: Locale;
};

export function GallerySection({
  items,
  homepage,
  locale,
}: GallerySectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        src: item.image_url,
        alt: localized(item.title_i18n, locale, item.title ?? ""),
        caption: localized(item.caption_i18n, locale, item.caption ?? ""),
      })),
    [items, locale],
  );

  return (
    <section id="gallery" className="bg-muted/50 px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "nav", "gallery")}
          title={getSectionHeading(
            homepage,
            locale,
            "gallery",
            t(locale, "sections", "gallery"),
          )}
          align="center"
        />

        {items.length === 0 ? (
          <p className="text-showroom-muted rounded-[20px] border border-dashed border-border p-16 text-center">
            {t(locale, "common", "no_items")}
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 lg:gap-5">
            {items.map((item, index) => {
              const alt = localized(item.title_i18n, locale, item.title ?? "");
              const caption = localized(
                item.caption_i18n,
                locale,
                item.caption ?? "",
              );
              const heights = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square", "aspect-[5/4]"];
              const aspect = heights[index % heights.length];

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.24) }}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative mb-4 w-full break-inside-avoid overflow-hidden rounded-[20px] text-start"
                >
                  <div className={cn("relative w-full", aspect)}>
                    <Image
                      src={item.image_url}
                      alt={alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-[var(--gold)]/0 transition-colors duration-500 group-hover:bg-[var(--gold)]/15" />
                    <span className="absolute end-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-card text-[var(--gold)] opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
                      <ZoomIn className="size-4" />
                    </span>
                  </div>
                  {caption ? (
                    <p className="text-showroom-muted mt-2 px-1 text-xs">{caption}</p>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <GalleryLightbox
        items={lightboxItems}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </section>
  );
}
