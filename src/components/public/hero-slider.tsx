"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "@/lib/motion";

import type { HeroSlide } from "@/types/hero-slides";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

type HeroSliderProps = {
  slides: HeroSlide[];
  className?: string;
  /** When true, show only the media layer (parent supplies chrome / copy). */
  mediaOnly?: boolean;
  onActiveChange?: (index: number, slide: HeroSlide) => void;
  showControls?: boolean;
  aspectClassName?: string;
};

export function HeroSlider({
  slides,
  className,
  mediaOnly = false,
  onActiveChange,
  showControls = true,
  aspectClassName = "min-h-[100svh]",
}: HeroSliderProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 32, watchDrag: slides.length > 1 },
    [
      Fade(),
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        playOnInit: slides.length > 1,
      }),
    ],
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setSelectedIndex(index);
      const slide = slides[index];
      if (slide) onActiveChange?.(index, slide);
    };

    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onActiveChange, slides]);

  useEffect(() => {
    if (!emblaApi) return;
    const autoplay = emblaApi.plugins()?.autoplay;
    if (!autoplay) return;
    if (hovered) autoplay.stop();
    else if (slides.length > 1) autoplay.play();
  }, [emblaApi, hovered, slides.length]);

  if (!slides.length) {
    return (
      <div
        className={cn(
          "hero-fallback-gradient relative w-full overflow-hidden",
          aspectClassName,
          className,
        )}
      />
    );
  }

  const active = slides[selectedIndex] ?? slides[0];

  return (
    <div
      className={cn("relative w-full overflow-hidden", aspectClassName, className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-roledescription="carousel"
      aria-label="Hero slider"
    >
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="relative min-w-0 shrink-0 grow-0 basis-full"
              aria-hidden={index !== selectedIndex}
            >
              <div className="absolute inset-0 overflow-hidden bg-background">
                <motion.div
                  className="absolute inset-[-4%] will-change-transform"
                  initial={false}
                  animate={
                    index === selectedIndex
                      ? { scale: 1.08, opacity: 1 }
                      : { scale: 1.02, opacity: 1 }
                  }
                  transition={{ duration: 5, ease: "linear" }}
                  style={{ transform: "translateZ(0)" }}
                >
                  <Image
                    src={slide.image_url}
                    alt={slide.title || `Hero slide ${index + 1}`}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 768px) 100vw, 100vw"
                    className="object-cover"
                  />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Smooth cross-fade veil to avoid flicker between Embla fade frames */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/0 transition-opacity duration-[800ms]"
        aria-hidden
      />

      {!mediaOnly ? (
        <>
          <div className="absolute inset-0 bg-primary/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-hover)]/55 via-primary/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-hover)]/35 via-transparent to-primary/10" />

          <div className="relative z-10 mx-auto flex min-h-[inherit] w-full max-w-[1400px] items-center px-5 py-28 md:px-10 md:py-32 lg:px-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl"
              >
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
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      ) : null}

      {showControls && slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Previous slide"
            className="absolute start-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/40 md:start-6"
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next slide"
            className="absolute end-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/40 md:end-6"
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </button>
          <div className="absolute bottom-6 start-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === selectedIndex}
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === selectedIndex
                    ? "w-8 bg-white"
                    : "w-2 bg-white/45 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
