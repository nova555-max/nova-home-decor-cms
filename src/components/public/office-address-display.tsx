"use client";

import { LocateFixed } from "lucide-react";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { buildGoogleMapsNavigationUrl, formatOfficePublicSubtitle } from "@/lib/office-location";
import { cn } from "@/lib/utils";
import type { OfficeLocation } from "@/types/office-location";

type OfficeAddressDisplayProps = {
  office: OfficeLocation | null;
  locale: Locale;
  className?: string;
  showHeading?: boolean;
  variant?: "default" | "footer" | "cta";
};

export function OfficeAddressDisplay({
  office,
  locale,
  className,
  showHeading = true,
  variant = "default",
}: OfficeAddressDisplayProps) {
  if (!office?.name?.trim()) return null;

  const subtitle = formatOfficePublicSubtitle(office);
  const mapUrl = buildGoogleMapsNavigationUrl(office.latitude, office.longitude);

  const content = (
    <>
      {showHeading ? (
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden>
            📍
          </span>
          <h3
            className={cn(
              "font-display font-medium",
              variant === "footer" ? "text-base" : "text-xl",
            )}
          >
            {t(locale, "contact_info", "office_address")}
          </h3>
        </div>
      ) : null}

      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group block transition hover:text-[var(--gold)]",
          variant === "cta"
            ? "inline-flex flex-col items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground"
            : variant === "footer"
              ? "mt-4 inline-flex max-w-sm items-start gap-2 text-sm leading-relaxed text-muted-foreground"
              : "text-base leading-relaxed text-foreground",
          showHeading && variant !== "footer" && "mt-4",
        )}
      >
        {variant === "footer" ? (
          <LocateFixed
            className="mt-0.5 size-4 shrink-0 text-[var(--gold)]"
            aria-hidden
          />
        ) : null}
        <span className={variant === "footer" ? "space-y-1" : undefined}>
          <span
            className={cn(
              "block font-medium",
              variant !== "cta" &&
                "underline decoration-[var(--gold)]/30 underline-offset-4 transition group-hover:decoration-[var(--gold)]",
              variant === "footer" && "text-foreground",
            )}
          >
            {office.name}
          </span>
          {subtitle ? (
            <span
              className={cn(
                "block",
                variant === "cta"
                  ? "text-primary-foreground/50 group-hover:text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      </a>
    </>
  );

  if (variant === "footer") {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {content}
    </div>
  );
}
