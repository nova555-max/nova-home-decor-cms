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

function resolveAddressParts(office: OfficeLocation) {
  const subtitle = formatOfficePublicSubtitle(office);
  const street = office.street?.trim() || null;
  const name = office.name?.trim() || "Nova Home Decor";

  // Prefer structured fields; otherwise parse free-text street.
  let city = office.city?.trim() || null;
  let region = office.district?.trim() || null;
  let country = office.country?.trim() || null;

  if ((!city || !region) && street) {
    const chunks = street
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .filter((c) => !/^nova\s*home/i.test(c));
    if (!city && chunks[0]) city = chunks[0];
    if (!region && chunks[1]) region = chunks[1];
    if (!country && chunks[2]) country = chunks[2];
  }

  const line = street
    ? street.replace(/^nova\s*home(?:\s*decor)?[,\s-]*/i, "").trim() || street
    : subtitle || name;

  return { name, line, city, region, country, subtitle };
}

/** Structured address: full line, city, region, country + Get Directions. */
export function LocationDetails({
  office,
  locale,
  className,
  showDirections = true,
  compact = false,
}: LocationDetailsProps) {
  const parts = resolveAddressParts(office);
  const directionsUrl = buildGoogleMapsNavigationUrl(
    office.latitude,
    office.longitude,
  );

  const rows: { label: string; value: string }[] = [
    { label: t(locale, "location", "address"), value: parts.line },
  ];
  if (parts.city) {
    rows.push({ label: t(locale, "location", "city"), value: parts.city });
  }
  if (parts.region) {
    rows.push({ label: t(locale, "location", "region"), value: parts.region });
  }
  if (parts.country) {
    rows.push({
      label: t(locale, "location", "country"),
      value: parts.country,
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
          <p className="font-medium text-foreground">{parts.name}</p>
          {parts.line ? (
            <p className="text-muted-foreground">{parts.line}</p>
          ) : null}
        </div>
      )}

      {showDirections ? (
        <ButtonLink
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="gold"
          className={cn("rounded-[16px]", compact && "h-9 px-4 text-xs")}
        >
          <Navigation className="size-4" />
          {t(locale, "location", "get_directions")}
        </ButtonLink>
      ) : null}
    </div>
  );
}
