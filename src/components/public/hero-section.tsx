"use client";

import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { showroomText } from "@/lib/showroom/content";
import type {
  HeroSection as HeroContent,
  HomepageContent,
  WebsiteSettings,
} from "@/types/database";
import type { HeroSlide } from "@/types/hero-slides";
import { HeroSlider } from "@/components/public/hero-slider";
import { ButtonLink } from "@/components/ui/button-link";

type HeroSectionProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  locale: Locale;
  /** Kept for call-site compatibility — intentionally unused (no product gallery). */
  categories?: unknown;
  /** Kept for call-site compatibility — intentionally unused (no product gallery). */
  products?: unknown;
  heroSlides?: HeroSlide[];
};

function legacyFallbackSlides(
  hero: HeroContent | undefined,
  settings: WebsiteSettings | null,
): HeroSlide[] {
  const urls = [
    ...(hero?.images ?? []).filter(Boolean),
    ...(hero?.image_url ? [hero.image_url] : []),
    ...(settings?.og_image ? [settings.og_image] : []),
  ].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);

  return urls.map((url, index) => ({
    id: `legacy-${index}`,
    image_url: url,
    title: null,
    subtitle: null,
    button_text: null,
    button_link: null,
    display_order: index,
    is_active: true,
    starts_at: null,
    ends_at: null,
    created_at: "",
    updated_at: "",
  }));
}

export function HeroSection({
  settings,
  homepage,
  locale,
  heroSlides = [],
}: HeroSectionProps) {
  const hero = homepage?.hero?.[locale] ?? homepage?.hero?.ku;
  const companyName = settings?.company_name ?? "Nova Home Decor";

  const slides = useMemo(() => {
    const fromDb = (heroSlides ?? [])
      .filter((s) => s?.is_active !== false && Boolean(s?.image_url?.trim()))
      .sort((a, b) => a.display_order - b.display_order);
    if (fromDb.length > 0) return fromDb;
    return legacyFallbackSlides(hero, settings);
  }, [hero, heroSlides, settings]);

  const [activeSlide, setActiveSlide] = useState<HeroSlide | null>(
    slides[0] ?? null,
  );

  useEffect(() => {
    if (!slides.length) {
      setActiveSlide(null);
      return;
    }
    setActiveSlide((current) => {
      if (current && slides.some((s) => s.id === current.id)) return current;
      return slides[0] ?? null;
    });
  }, [slides]);

  // Title / description / CTAs only — no badges, labels, or product cards
  const title = activeSlide?.title?.trim() || hero?.title || companyName;
  const description =
    activeSlide?.subtitle?.trim() ||
    showroomText(hero?.description, t(locale, "hero", "description"));

  const primaryCta =
    activeSlide?.button_text?.trim() && activeSlide.button_link?.trim()
      ? {
          label: activeSlide.button_text.trim(),
          href: activeSlide.button_link.trim(),
        }
      : {
          label: hero?.cta_secondary || t(locale, "hero", "cta_products"),
          href: "#products",
        };

  const secondaryLabel = showroomText(
    hero?.cta_contact,
    t(locale, "hero", "cta_contact"),
  );

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden bg-background"
      aria-label={companyName}
      data-hero-slides={slides.length}
    >
      <HeroSlider
        slides={slides}
        mediaOnly
        showControls={slides.length > 1}
        aspectClassName="min-h-[100svh]"
        onActiveChange={(_, slide) => setActiveSlide(slide)}
      >
        <div className="pointer-events-none absolute inset-0 bg-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center px-5 py-24 sm:px-8 sm:py-28 md:px-10 md:py-32 lg:px-14 lg:py-36">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h1 className="font-display text-[clamp(2.25rem,1.6rem+3.5vw,4.5rem)] leading-[1.05] font-medium tracking-tight text-white drop-shadow-[0_2px_24px_rgb(0_0_0_/_0.45)]">
              {title}
            </h1>

            {description ? (
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                {description}
              </p>
            ) : null}

            <div className="pointer-events-auto mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4">
              <ButtonLink
                href={primaryCta.href}
                variant="gold"
                size="lg"
                className="rounded-[20px] px-7 sm:px-8"
              >
                {primaryCta.label}
              </ButtonLink>
              <ButtonLink
                href="#contact-info"
                size="lg"
                variant="outline"
                className="rounded-[20px] border-white/35 bg-white/10 px-7 text-white backdrop-blur-md hover:border-white/55 hover:bg-white/15 hover:text-white sm:px-8"
              >
                {secondaryLabel}
              </ButtonLink>
            </div>
          </div>
        </div>
      </HeroSlider>
    </section>
  );
}
