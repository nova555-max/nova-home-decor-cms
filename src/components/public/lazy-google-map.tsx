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
}: LazyGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || shouldLoad) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.08 },
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
        variant === "preview" ? "min-h-[140px] rounded-2xl" : "min-h-[280px] md:min-h-[380px]",
        className,
      )}
    >
      {!shouldLoad ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--showroom-card)] via-muted/40 to-[var(--gold)]/10">
          <MapPin className="size-6 text-[var(--gold)] opacity-80" aria-hidden />
          <span className="text-muted-foreground text-xs tracking-wide">
            …
          </span>
        </div>
      ) : (
        <iframe
          title={title}
          src={embedSrc}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
    </div>
  );
}
