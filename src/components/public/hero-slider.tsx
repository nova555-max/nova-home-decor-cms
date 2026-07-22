"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { HeroSlide } from "@/types/hero-slides";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5000;
const FADE_MS = 500;

type HeroSliderProps = {
  slides: HeroSlide[];
  className?: string;
  /** When true, hide built-in copy (use `children` for overlay). */
  mediaOnly?: boolean;
  children?: ReactNode;
  onActiveChange?: (index: number, slide: HeroSlide) => void;
  showControls?: boolean;
  aspectClassName?: string;
};

function sortSlides(slides: HeroSlide[]): HeroSlide[] {
  return [...slides]
    .filter((s) => Boolean(s?.image_url?.trim()))
    .sort((a, b) => a.display_order - b.display_order);
}

export function HeroSlider({
  slides: slidesProp,
  className,
  mediaOnly = false,
  children,
  onActiveChange,
  showControls = true,
  aspectClassName = "min-h-[100svh]",
}: HeroSliderProps) {
  const slides = useMemo(() => sortSlides(slidesProp), [slidesProp]);
  const count = slides.length;
  const canLoop = count > 1;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);
  const onActiveChangeRef = useRef(onActiveChange);

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  const slidesKey = slides.map((s) => s.id).join("|");

  // Clamp index when slide list changes
  useEffect(() => {
    setIndex((current) => {
      if (count === 0) return 0;
      return current >= count ? 0 : current;
    });
  }, [count, slidesKey]);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      const normalized = ((next % count) + count) % count;
      indexRef.current = normalized;
      setIndex(normalized);
      const slide = slides[normalized];
      if (slide) onActiveChangeRef.current?.(normalized, slide);
    },
    [count, slides],
  );

  const goPrev = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);

  // Notify parent of initial / changed slide
  useEffect(() => {
    indexRef.current = index;
    const slide = slides[index];
    if (slide) onActiveChangeRef.current?.(index, slide);
  }, [index, slides]);

  // Autoplay every 5s
  useEffect(() => {
    if (!canLoop || paused) return;
    const timer = window.setInterval(() => {
      goTo(indexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [canLoop, paused, goTo]);

  // Preload next image
  useEffect(() => {
    if (!canLoop) return;
    const next = slides[(index + 1) % count];
    if (!next?.image_url) return;
    const img = new window.Image();
    img.decoding = "async";
    img.src = next.image_url;
  }, [canLoop, count, index, slides]);

  if (!count) {
    return (
      <div
        className={cn(
          "hero-fallback-gradient relative w-full overflow-hidden",
          aspectClassName,
          className,
        )}
      >
        {children}
      </div>
    );
  }

  const active = slides[index] ?? slides[0];
  const nextIndex = canLoop ? (index + 1) % count : -1;

  return (
    <div
      className={cn("relative w-full overflow-hidden", aspectClassName, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      aria-roledescription="carousel"
      aria-label="Hero slider"
    >
      {/* Stacked slides — all rendered; active fades in */}
      <div className="absolute inset-0 z-0">
        {slides.map((slide, i) => {
          const isActive = i === index;
          const eager = i === 0 || i === index || i === nextIndex;
          return (
            <div
              key={slide.id}
              className="absolute inset-0"
              style={{
                opacity: isActive ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                zIndex: isActive ? 1 : 0,
                pointerEvents: isActive ? "auto" : "none",
              }}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.image_url}
                alt={slide.title || `Hero slide ${i + 1}`}
                fill
                priority={i === 0}
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : "auto"}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          );
        })}
      </div>

      {!mediaOnly ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-primary/25" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[var(--primary-hover)]/55 via-primary/20 to-transparent" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[var(--primary-hover)]/35 via-transparent to-primary/10" />

          <div className="relative z-10 mx-auto flex min-h-[inherit] w-full max-w-[1400px] items-center px-5 py-28 md:px-10 md:py-32 lg:px-14">
            <div className="max-w-xl">
              {active.title ? (
                <h2 className="font-display text-[clamp(2rem,1.5rem+3vw,3.75rem)] leading-[1.05] font-medium tracking-tight text-[var(--hero-overlay-fg)] drop-shadow-[0_2px_24px_rgb(47_47_47_/_0.35)]">
                  {active.title}
                </h2>
              ) : null}
              {active.subtitle ? (
                <p className="mt-4 text-lg text-[var(--hero-overlay-fg)]/90 md:text-xl">
                  {active.subtitle}
                </p>
              ) : null}
              {active.button_text && active.button_link ? (
                <div className="mt-8">
                  <ButtonLink
                    href={active.button_link}
                    variant="gold"
                    size="lg"
                    className="rounded-[20px] px-8"
                  >
                    {active.button_text}
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : children ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex min-h-full w-full items-center">
          {children}
        </div>
      ) : null}

      {showControls && canLoop ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="absolute start-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/45 sm:start-4 sm:size-11 md:start-6"
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="absolute end-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/45 sm:end-4 sm:size-11 md:end-6"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </button>
          <div className="absolute bottom-5 start-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-6">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-8 bg-white"
                    : "w-2 bg-white/45 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Screen-reader live region */}
      <div className="sr-only" aria-live="polite">
        Slide {index + 1} of {count}
      </div>
    </div>
  );
}
