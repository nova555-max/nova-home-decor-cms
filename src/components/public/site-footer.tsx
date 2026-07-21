"use client";

import { useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WebsiteSettings } from "@/types/database";
import type { OfficeLocation } from "@/types/office-location";
import { LazyGoogleMap } from "@/components/public/lazy-google-map";
import { LocationDetails } from "@/components/public/location-details";
import { LuxuryButton } from "@/components/public/showroom/luxury-button";
import { PhoneLinkList, PhoneText } from "@/components/ui/phone-link";
import { Input } from "@/components/ui/input";

type SiteFooterProps = {
  settings: WebsiteSettings | null;
  locale: Locale;
  office: OfficeLocation | null;
};

export function SiteFooter({ settings, locale, office }: SiteFooterProps) {
  const companyName = settings?.company_name ?? "Nova Home Decor";
  const waLink = whatsappLink(settings?.whatsapp_number);
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error(t(locale, "quote", "required"));
      return;
    }
    setEmail("");
    toast.success(t(locale, "footer", "newsletter_success"));
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20 lg:px-14">
        <div className="grid gap-12 sm:grid-cols-2 xl:grid-cols-12 xl:gap-8">
          <div className="xl:col-span-3">
            <h3 className="font-display text-2xl font-medium tracking-tight text-foreground">
              {companyName}
            </h3>
            {settings?.company_description ? (
              <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-relaxed">
                {settings.company_description}
              </p>
            ) : null}
          </div>

          <div className="xl:col-span-2">
            <h4 className="text-showroom-accent mb-5 text-xs tracking-[0.28em] uppercase">
              {t(locale, "footer", "contact")}
            </h4>
            <div className="space-y-3 text-sm text-foreground">
              <PhoneLinkList
                fields={[settings?.phone_number]}
                className="space-y-3"
                itemClassName="text-sm text-foreground"
              />
              {settings?.email_addresses?.map((entry) => (
                <div key={entry.id}>
                  <a
                    href={`mailto:${entry.email}`}
                    className="transition hover:text-[var(--gold)]"
                  >
                    {entry.label ? `${entry.label}: ` : ""}
                    {entry.email}
                  </a>
                </div>
              ))}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="inline-flex flex-wrap items-center gap-2.5 transition hover:text-[var(--gold)]"
                  style={{ unicodeBidi: "plaintext" }}
                >
                  <MessageCircle className="size-4 shrink-0 opacity-60" />
                  <span className="whitespace-nowrap">
                    {t(locale, "common", "whatsapp")}
                  </span>
                  {settings?.whatsapp_number ? (
                    <PhoneText
                      phone={settings.whatsapp_number}
                      className="text-muted-foreground"
                    />
                  ) : null}
                </a>
              ) : null}
            </div>
          </div>

          <div className="xl:col-span-3">
            <h4 className="text-showroom-accent mb-5 text-xs tracking-[0.28em] uppercase">
              {t(locale, "footer", "location")}
            </h4>
            {office && office.latitude != null && office.longitude != null ? (
              <div className="space-y-4">
                <LazyGoogleMap
                  latitude={office.latitude}
                  longitude={office.longitude}
                  title={office.name}
                  variant="preview"
                  className="border border-border/60 shadow-sm"
                />
                <LocationDetails
                  office={office}
                  locale={locale}
                  compact
                  showDirections
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t(locale, "contact", "map_unavailable")}
              </p>
            )}
          </div>

          <div className="xl:col-span-2">
            <h4 className="text-showroom-accent mb-5 text-xs tracking-[0.28em] uppercase">
              {t(locale, "footer", "follow")}
            </h4>
            <div className="flex flex-wrap gap-3">
              {settings?.facebook_url ? (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
                  aria-label="Facebook"
                >
                  <Share2 className="size-4" />
                </a>
              ) : null}
              {settings?.instagram_url ? (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
                  aria-label="Instagram"
                >
                  <Share2 className="size-4" />
                </a>
              ) : null}
              {settings?.tiktok_url ? (
                <a
                  href={settings.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border text-xs font-bold transition hover:border-primary hover:text-primary"
                  aria-label="TikTok"
                >
                  TT
                </a>
              ) : null}
              {settings?.telegram_url ? (
                <a
                  href={settings.telegram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border text-xs font-bold transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
                  aria-label="Telegram"
                >
                  TG
                </a>
              ) : null}
              {!settings?.facebook_url &&
              !settings?.instagram_url &&
              !settings?.tiktok_url &&
              !settings?.telegram_url ? (
                <span className="text-showroom-muted inline-flex size-11 items-center justify-center rounded-full border border-dashed border-border">
                  <Share2 className="size-4 opacity-40" />
                </span>
              ) : null}
            </div>
          </div>

          <div className="sm:col-span-2 xl:col-span-2">
            <h4 className="text-showroom-accent mb-2 text-xs tracking-[0.28em] uppercase">
              {t(locale, "footer", "newsletter_title")}
            </h4>
            <p className="text-showroom-muted mb-4 text-sm">
              {t(locale, "footer", "newsletter_subtitle")}
            </p>
            <form onSubmit={subscribe} className="flex flex-col gap-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(locale, "footer", "newsletter_placeholder")}
                className="rounded-[12px] border-border bg-background"
              />
              <LuxuryButton type="submit" className="shrink-0">
                {t(locale, "footer", "newsletter_submit")}
              </LuxuryButton>
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-5 py-6 text-center md:px-10 lg:px-14">
        <p className="text-muted-foreground text-xs tracking-wide">
          © {year} Nova Home Decor. {t(locale, "footer", "rights")}.
        </p>
        <p className="text-muted-foreground/80 mt-2 text-[11px] tracking-wide">
          {t(locale, "footer", "credit")}
        </p>
      </div>
    </footer>
  );
}
