"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import type { Locale } from "@/config/site";
import {
  getProductImageUrl,
  HERO_GALLERY_ROTATE_MS,
  heroGalleryIntervalMs,
  resolveHeroShowcaseProducts,
} from "@/lib/hero/showcase-products";
import {
  categoryName,
  productName,
  type Category,
  type Product,
} from "@/types/database";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 32, mass: 0.85 };
const FADE_SPRING = { type: "spring" as const, stiffness: 220, damping: 28, mass: 0.9 };

type HeroProductGalleryProps = {
  products: Product[];
  categories: Category[];
  locale: Locale;
  className?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function HeroProductGallery({
  products,
  categories,
  locale,
  className,
}: HeroProductGalleryProps) {
  const showcaseProducts = useMemo(
    () => resolveHeroShowcaseProducts(products),
    [products],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.6 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [-7, 7]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const parallaxX = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [-10, 10]);

  const count = showcaseProducts.length;
  const activeProduct = showcaseProducts[activeIndex];

  const goTo = useCallback(
    (index: number) => {
      if (!count) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!count || count < 2 || isPaused || reducedMotion) return;

    const timer = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, heroGalleryIntervalMs());

    return () => clearTimeout(timer);
  }, [count, isPaused, reducedMotion, activeIndex]);

  useEffect(() => {
    if (count < 2) return;
    const next = showcaseProducts[(activeIndex + 1) % count];
    const url = getProductImageUrl(next);
    if (!url) return;
    const img = new window.Image();
    img.src = url;
  }, [activeIndex, count, showcaseProducts]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      pointerX.set(x);
      pointerY.set(y);
    },
    [pointerX, pointerY, reducedMotion],
  );

  const resetParallax = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  if (!count || !activeProduct) {
    return null;
  }

  const activeImage = getProductImageUrl(activeProduct);
  const activeCategory = categories.find(
    (c) => c.id === activeProduct.category_id,
  );

  return (
    <div
      ref={containerRef}
      className={cn("hero-product-gallery relative w-full", className)}
      onPointerMove={handlePointerMove}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIsPaused(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setIsPaused(false);
        resetParallax();
      }}
      aria-roledescription="carousel"
      aria-label="Featured products"
    >
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
        transition={
          reducedMotion
            ? undefined
            : {
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        style={{
          rotateX: reducedMotion ? 0 : rotateX,
          rotateY: reducedMotion ? 0 : rotateY,
          transformPerspective: 1200,
        }}
        className="hero-product-gallery-stage relative mx-auto w-full max-w-[540px] md:max-w-[580px] lg:max-w-none"
      >
        <div
          className="hero-product-gallery-glow pointer-events-none absolute inset-0 -z-10 scale-110 blur-3xl"
          aria-hidden
        />

        <div className="relative aspect-[4/5] w-full sm:aspect-[5/6] md:aspect-[4/5] lg:aspect-auto lg:h-[500px] lg:min-h-[480px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeProduct.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={FADE_SPRING}
              style={{
                x: reducedMotion ? 0 : parallaxX,
                y: reducedMotion ? 0 : parallaxY,
              }}
              className="hero-product-gallery-card group absolute inset-0 overflow-hidden rounded-[24px] md:rounded-[28px]"
            >
              <Link
                href="#products"
                className="relative block size-full"
                aria-label={productName(activeProduct, locale)}
              >
                {activeImage ? (
                  <motion.div
                    className="absolute inset-0"
                    whileHover={reducedMotion ? undefined : { scale: 1.06 }}
                    transition={SPRING}
                  >
                    <Image
                      src={activeImage}
                      alt={productName(activeProduct, locale)}
                      fill
                      priority={activeIndex === 0}
                      loading={activeIndex === 0 ? "eager" : "lazy"}
                      quality={85}
                      className="object-cover"
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 520px"
                    />
                  </motion.div>
                ) : null}

                <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-hover)]/80 via-[var(--primary-hover)]/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--gold)]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  {activeCategory ? (
                    <span className="hero-product-gallery-badge mb-3 inline-block rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.22em] uppercase">
                      {categoryName(activeCategory, locale)}
                    </span>
                  ) : null}
                  <p className="font-display text-lg leading-tight font-medium text-[var(--hero-overlay-fg)] md:text-xl">
                    {productName(activeProduct, locale)}
                  </p>
                </div>
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {count > 1 ? (
          <div className="mt-5 flex items-center justify-center gap-2">
            {showcaseProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => goTo(index)}
                className={cn(
                  "hero-product-gallery-dot h-2 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "hero-product-gallery-dot-active w-8"
                    : "w-2 opacity-50 hover:opacity-80",
                )}
                aria-label={`Show product ${index + 1}`}
                aria-current={index === activeIndex}
              />
            ))}
          </div>
        ) : null}

        {count > 1 ? (
          <div className="mt-4 hidden gap-2 sm:flex sm:justify-center">
            {showcaseProducts.slice(0, 5).map((product, index) => {
              const thumb = getProductImageUrl(product);
              if (!thumb) return null;
              return (
                <button
                  key={`thumb-${product.id}`}
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "hero-product-gallery-thumb relative size-14 overflow-hidden rounded-xl border transition-all duration-300 md:size-16",
                    index === activeIndex
                      ? "hero-product-gallery-thumb-active scale-105"
                      : "opacity-60 hover:opacity-90",
                  )}
                >
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    loading="lazy"
                    quality={70}
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </motion.div>

      {count > 1 && !isPaused && !reducedMotion ? (
        <motion.div
          key={activeIndex}
          className="hero-product-gallery-progress absolute -bottom-1 start-0 h-0.5 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: HERO_GALLERY_ROTATE_MS / 1000, ease: "linear" }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
