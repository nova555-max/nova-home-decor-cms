"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { buildGoogleMapsEmbedUrl } from "@/lib/office-location";
import { cn } from "@/lib/utils";

type LazyGoogleMapProps = {
  latitude: number;
  longitude: number;
  title: string;
  className?: string;
  /** Compact preview (footer) vs full contact map */
  variant?: "full" | "preview";
  zoom?: number;
  /** Load immediately without waiting for intersection (contact panel). */
  eager?: boolean;
};

/**
 * Lazy-loads a Google Maps embed only after the container enters the viewport.
 * Avoids fetching Maps until the location section is visible.
 */
export function LazyGoogleMap({
  latitude,
  longitude,
  title,
  className,
  variant = "full",
  zoom,
  eager = false,
}: LazyGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);

  useEffect(() => {
    if (shouldLoad) return;
    const node = containerRef.current;
    if (!node) return;

    const reveal = () => setShouldLoad(true);

    // Already on screen (e.g. scrolled into contact) — load without waiting.
    const rect = node.getBoundingClientRect();
    const inView =
      rect.top < window.innerHeight + 160 && rect.bottom > -80;
    if (inView) {
      reveal();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      : undefined;

  const embedSrc = buildGoogleMapsEmbedUrl(latitude, longitude, {
    zoom: zoom ?? (variant === "preview" ? 14 : 15),
    apiKey,
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted/60",
        variant === "preview"
          ? "min-h-[160px] rounded-2xl"
          : "aspect-[4/3] min-h-[280px] w-full md:min-h-[380px]",
        className,
      )}
    >
      {!shouldLoad ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--showroom-card)] via-muted/40 to-[var(--gold)]/10">
          <MapPin className="size-6 text-[var(--gold)] opacity-80" aria-hidden />
        </div>
      ) : (
        <iframe
          title={title}
          src={embedSrc}
          className="absolute inset-0 size-full border-0"
          loading={eager ? "eager" : "lazy"}
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
    </div>
  );
}
