"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { AnimatePresence, motion } from "@/lib/motion";

import { cn } from "@/lib/utils";

type LightboxItem = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
};

type GalleryLightboxProps = {
  items: LightboxItem[];
  initialIndex: number | null;
  onClose: () => void;
};

export function GalleryLightbox({
  items,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (initialIndex != null) setIndex(initialIndex);
    setZoomed(false);
  }, [initialIndex]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + items.length) % items.length);
      setZoomed(false);
    },
    [items.length],
  );

  useEffect(() => {
    if (initialIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [initialIndex, onClose, go]);

  const item = items[index];

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || zoomed) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    go(delta < 0 ? 1 : -1);
  };

  return (
    <AnimatePresence>
      {initialIndex != null && item ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--primary-hover)]/92 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:p-8"
          onClick={onClose}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] z-10 inline-flex size-11 items-center justify-center rounded-full bg-[var(--hero-overlay-bg)] text-[var(--hero-overlay-fg)] backdrop-blur-md transition hover:bg-[var(--hero-overlay-border)]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute start-3 top-1/2 z-10 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--hero-overlay-bg)] text-[var(--hero-overlay-fg)] backdrop-blur-md transition hover:bg-[var(--hero-overlay-border)] md:start-4"
                aria-label="Previous"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute end-3 top-1/2 z-10 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--hero-overlay-bg)] text-[var(--hero-overlay-fg)] backdrop-blur-md transition hover:bg-[var(--hero-overlay-border)] md:end-4"
                aria-label="Next"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          ) : null}

          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            className="relative flex max-h-[85vh] w-full max-w-6xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative max-h-[75vh] w-full overflow-hidden rounded-[20px]",
                zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              onClick={() => setZoomed((z) => !z)}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={1600}
                height={1200}
                className={cn(
                  "mx-auto max-h-[75vh] w-auto object-contain transition-transform duration-500",
                  zoomed && "scale-125",
                )}
                sizes="100vw"
                priority
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[var(--hero-overlay-fg)]/70">
              <ZoomIn className="size-4" />
              {item.caption ? (
                <p className="text-sm">{item.caption}</p>
              ) : null}
              {items.length > 1 ? (
                <span className="text-xs">
                  {index + 1} / {items.length}
                </span>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
