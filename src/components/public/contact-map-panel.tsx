"use client";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { OfficeLocation } from "@/types/office-location";
import { LazyGoogleMap } from "@/components/public/lazy-google-map";
import { LocationDetails } from "@/components/public/location-details";

type ContactMapPanelProps = {
  office: OfficeLocation | null;
  locale: Locale;
  className?: string;
};

/** Interactive Google Map embed (lazy) + structured address + Get Directions. */
export function ContactMapPanel({
  office,
  locale,
  className,
}: ContactMapPanelProps) {
  if (!office || office.latitude == null || office.longitude == null) {
    return (
      <div
        className={cn(
          "showroom-glass flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-[22px] border border-white/40 p-8 text-center shadow-[0_18px_48px_-24px_rgb(47_47_47_/_0.28)] backdrop-blur-xl dark:border-white/10",
          className,
        )}
      >
        <p className="text-showroom-muted text-sm">
          {t(locale, "contact", "map_unavailable")}
        </p>
        <p className="text-muted-foreground max-w-xs text-xs">
          {t(locale, "contact", "map_setup_hint")}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "showroom-glass overflow-hidden rounded-[22px] border border-white/40 shadow-[0_22px_56px_-24px_rgb(47_47_47_/_0.32)] backdrop-blur-xl dark:border-white/10",
        className,
      )}
    >
      <LazyGoogleMap
        latitude={office.latitude}
        longitude={office.longitude}
        title={office.name}
        variant="full"
        className="rounded-none"
      />
      <div className="space-y-5 p-6 md:p-8">
        <div>
          <p className="text-showroom-accent mb-2 text-[11px] tracking-[0.28em] uppercase">
            {t(locale, "location", "title")}
          </p>
          <h3 className="font-display text-xl font-medium tracking-tight">
            {office.name}
          </h3>
        </div>
        <LocationDetails office={office} locale={locale} />
      </div>
    </div>
  );
}
