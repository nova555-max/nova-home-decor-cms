"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useScroll, useTransform } from "framer-motion";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { resolveHeroShowcaseProducts } from "@/lib/hero/showcase-products";
import { t } from "@/lib/i18n";
import { showroomText } from "@/lib/showroom/content";
import type {
  Category,
  HeroSection as HeroContent,
  HomepageContent,
  Product,
  WebsiteSettings,
} from "@/types/database";
import { HeroProductGallery } from "@/components/public/showroom/hero-product-gallery";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  locale: Locale;
  categories: Category[];
  products: Product[];
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function resolveHeroMediaUrls(
  hero: HeroContent | undefined,
  settings: WebsiteSettings | null,
): string[] {
  const fromList = (hero?.images ?? []).filter(Boolean).slice(0, 8);
  if (fromList.length > 0) return fromList;
  if (hero?.image_url) return [hero.image_url];
  if (settings?.og_image) return [settings.og_image];
  if (settings?.company_logo) return [settings.company_logo];
  return [];
}

export function HeroSection({
  settings,
  homepage,
  locale,
  categories,
  products,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);

  const hero = homepage?.hero?.[locale] ?? homepage?.hero?.ku;
  const companyName = settings?.company_name ?? "Nova Home Decor";
  const mediaUrls = useMemo(
    () => resolveHeroMediaUrls(hero, settings),
    [hero, settings],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaUrl = mediaUrls[activeIndex] ?? null;
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

  useEffect(() => {
    setActiveIndex(0);
  }, [mediaUrls]);

  useEffect(() => {
    if (mediaUrls.length <= 1 || isVideo) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % mediaUrls.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [mediaUrls, isVideo]);

  const title = hero?.title || companyName;
  const subtitle = hero?.subtitle || t(locale, "hero", "subtitle");
  const description = showroomText(
    hero?.description,
    t(locale, "hero", "description"),
  );

  const hasGallery = useMemo(
    () => resolveHeroShowcaseProducts(products).length > 0,
    [products],
  );

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-background"
      aria-label={companyName}
    >
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 -top-[10%] h-[120%]">
        {mediaUrls.length === 0 ? (
          <div className="hero-fallback-gradient absolute inset-0" />
        ) : isVideo && mediaUrl ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
            poster={settings?.og_image ?? undefined}
          >
            <source src={mediaUrl} />
          </video>
        ) : (
          mediaUrls.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt={title}
              fill
              priority={index === 0}
              className={cn(
                "object-cover transition-opacity duration-1000",
                index === activeIndex ? "opacity-100" : "opacity-0",
              )}
              sizes="100vw"
            />
          ))
        )}
      </motion.div>

      <div className="absolute inset-0 bg-primary/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-hover)]/55 via-primary/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-hover)]/35 via-transparent to-primary/10" />

      <div
        className={cn(
          "relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-10 px-5 py-28 md:gap-12 md:px-10 md:py-32 lg:px-14 lg:py-36",
          hasGallery && "lg:grid-cols-[1.05fr_0.95fr] lg:gap-8",
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={cn("max-w-xl", hasGallery ? "lg:max-w-none" : "mx-auto text-center lg:mx-auto")}
        >
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[var(--gold)] mb-5 text-xs font-semibold tracking-[0.32em] uppercase"
          >
            {hero?.cta_primary || t(locale, "hero", "luxury_label")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.18 }}
            className="font-display text-[clamp(2.5rem,2rem+3.5vw,4.75rem)] leading-[1.04] font-medium tracking-tight text-[var(--hero-overlay-fg)] drop-shadow-[0_2px_24px_rgb(47_47_47_/_0.35)]"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28 }}
            className="mt-5 text-lg leading-snug font-medium text-[var(--hero-overlay-fg)]/95 md:text-xl"
          >
            {subtitle}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.36 }}
            className={cn(
              "mt-4 text-base leading-relaxed text-[var(--hero-overlay-fg)]/80 md:text-[1.05rem]",
              !hasGallery && "mx-auto max-w-2xl",
              hasGallery && "max-w-lg",
            )}
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.44 }}
            className={cn(
              "mt-10 flex flex-wrap gap-3 md:gap-4",
              !hasGallery && "justify-center",
            )}
          >
            <ButtonLink
              href="#products"
              variant="gold"
              size="lg"
              className="rounded-[20px] px-8 shadow-soft transition-all duration-300 hover:scale-[1.03] hover:shadow-soft-lg active:scale-[0.98]"
            >
              {hero?.cta_secondary || t(locale, "hero", "cta_products")}
            </ButtonLink>
            <ButtonLink
              href="#contact-info"
              size="lg"
              variant="outline"
              className="rounded-[20px] border-[var(--hero-overlay-border)] bg-[var(--hero-overlay-bg)] px-8 text-[var(--hero-overlay-fg)] shadow-soft backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-[var(--hero-overlay-fg)]/45 hover:bg-[var(--hero-overlay-bg)] hover:text-[var(--hero-overlay-fg)] hover:shadow-soft-lg active:scale-[0.98]"
            >
              {showroomText(hero?.cta_contact, t(locale, "hero", "cta_contact"))}
            </ButtonLink>
          </motion.div>
        </motion.div>

        {hasGallery ? (
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 28,
              delay: 0.5,
            }}
            className="relative mx-auto w-full max-w-[540px] lg:mx-0 lg:max-w-none"
          >
            <HeroProductGallery
              products={products}
              categories={categories}
              locale={locale}
            />
          </motion.div>
        ) : null}
      </div>

      {mediaUrls.length > 1 && !isVideo ? (
        <div className="absolute bottom-20 start-1/2 z-10 flex -translate-x-1/2 gap-2">
          {mediaUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "size-2 rounded-full transition-all",
                index === activeIndex
                  ? "bg-[var(--hero-overlay-fg)] scale-110"
                  : "bg-[var(--hero-overlay-fg)]/40 hover:bg-[var(--hero-overlay-fg)]/70",
              )}
            />
          ))}
        </div>
      ) : null}

      <motion.a
        href="#stats"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="absolute bottom-8 start-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[var(--hero-overlay-fg)]/75 transition hover:text-[var(--hero-overlay-fg)]"
        aria-label={t(locale, "hero", "scroll")}
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">
          {t(locale, "hero", "scroll")}
        </span>
        <ChevronDown className="size-5 animate-bounce" />
      </motion.a>
    </section>
  );
}
