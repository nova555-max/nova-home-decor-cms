"use client";

import { Navigation } from "lucide-react";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import {
  buildGoogleMapsNavigationUrl,
  formatOfficePublicSubtitle,
} from "@/lib/office-location";
import { cn } from "@/lib/utils";
import type { OfficeLocation } from "@/types/office-location";
import { ButtonLink } from "@/components/ui/button-link";

type LocationDetailsProps = {
  office: OfficeLocation;
  locale: Locale;
  className?: string;
  showDirections?: boolean;
  compact?: boolean;
};

/** Structured address: full line, city, region, country + Get Directions. */
export function LocationDetails({
  office,
  locale,
  className,
  showDirections = true,
  compact = false,
}: LocationDetailsProps) {
  const fullAddress =
    [office.street, office.name].filter((p) => p?.trim()).join(" · ") ||
    office.name;
  const region = office.district?.trim() || null;
  const directionsUrl = buildGoogleMapsNavigationUrl(
    office.latitude,
    office.longitude,
  );

  const rows: { label: string; value: string }[] = [
    { label: t(locale, "location", "address"), value: fullAddress },
  ];
  if (office.city?.trim()) {
    rows.push({ label: t(locale, "location", "city"), value: office.city });
  }
  if (region) {
    rows.push({ label: t(locale, "location", "region"), value: region });
  }
  if (office.country?.trim()) {
    rows.push({
      label: t(locale, "location", "country"),
      value: office.country,
    });
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!compact ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-0.5 border-b border-border/40 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="text-showroom-accent text-[11px] tracking-[0.22em] uppercase">
                {row.label}
              </span>
              <span className="text-sm font-medium text-foreground sm:text-end">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1 text-sm leading-relaxed">
          <p className="font-medium text-foreground">{office.name}</p>
          {formatOfficePublicSubtitle(office) ? (
            <p className="text-muted-foreground">
              {formatOfficePublicSubtitle(office)}
            </p>
          ) : null}
          {office.street?.trim() ? (
            <p className="text-muted-foreground">{office.street}</p>
          ) : null}
        </div>
      )}

      {showDirections ? (
        <ButtonLink
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="gold"
          className={cn(
            "rounded-[16px]",
            compact && "h-9 px-4 text-xs",
          )}
        >
          <Navigation className="size-4" />
          {t(locale, "location", "get_directions")}
        </ButtonLink>
      ) : null}
    </div>
  );
}
