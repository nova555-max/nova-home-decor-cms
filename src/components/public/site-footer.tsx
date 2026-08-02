"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
} from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import { formatOfficePublicSubtitle } from "@/lib/office-location";
import { cn } from "@/lib/utils";
import type { WebsiteSettings } from "@/types/database";
import type { OfficeLocation } from "@/types/office-location";
import { LazyGoogleMap } from "@/components/public/lazy-google-map";
import { PhoneLinkList, PhoneText } from "@/components/ui/phone-link";
import { ButtonLink } from "@/components/ui/button-link";

type SiteFooterProps = {
  settings: WebsiteSettings | null;
  locale: Locale;
  office: OfficeLocation | null;
};

const QUICK_LINKS = [
  { href: "/", key: "home" as const },
  { href: "/#categories", key: "products" as const },
  { href: "/#projects", key: "projects" as const },
  { href: "/#gallery", key: "gallery" as const },
  { href: "/#contact", key: "contact" as const },
] as const;

function FooterPanel({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "showroom-glass relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/35 p-7 shadow-[0_22px_60px_-28px_rgb(30_31_27_/_0.35)] backdrop-blur-xl md:p-8",
        "transition duration-500 hover:-translate-y-1 hover:border-[var(--gold)]/35 hover:shadow-[0_28px_70px_-24px_rgb(201_169_110_/_0.28)]",
        "dark:border-white/10",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/55 to-transparent"
        aria-hidden
      />
      {children}
    </motion.div>
  );
}

function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-showroom-accent mb-5 text-[11px] tracking-[0.28em] uppercase">
      {children}
    </h4>
  );
}

function ContactMiniCard({
  icon,
  title,
  children,
  href,
  target,
  rel,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}) {
  const className =
    "group flex items-start gap-3 rounded-[18px] border border-white/20 bg-background/35 p-3.5 transition duration-300 hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/8 dark:border-white/10";

  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 text-[var(--gold)] transition group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs tracking-wide text-muted-foreground">
          {title}
        </span>
        <div className="mt-0.5 text-sm font-medium text-foreground">
          {children}
        </div>
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={className}>
        {body}
      </a>
    );
  }

  return <div className={className}>{body}</div>;
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-12 items-center justify-center rounded-full border border-white/25 bg-background/30 text-foreground shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[var(--gold)] hover:bg-[var(--gold)]/15 hover:text-[var(--gold)] dark:border-white/10"
    >
      {children}
    </a>
  );
}

export function SiteFooter({ settings, locale, office }: SiteFooterProps) {
  const companyName = settings?.company_name ?? "Nova Home Decor";
  const description =
    settings?.company_description?.trim() ||
    t(locale, "footer", "default_description");
  const waLink = whatsappLink(settings?.whatsapp_number);
  const primaryEmail = settings?.email_addresses?.[0];
  const year = new Date().getFullYear();
  const addressLine = office
    ? [
        office.name,
        formatOfficePublicSubtitle({
          city: office.city,
          district: office.district,
          country: office.country,
          street: office.street,
        }),
      ]
        .filter(Boolean)
        .join(" — ")
    : settings?.company_address?.trim() || null;

  const directionsHref =
    office != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${office.latitude},${office.longitude}`
      : settings?.google_maps_url?.trim() || null;

  const socials = [
    {
      key: "facebook",
      href: settings?.facebook_url,
      label: "Facebook",
      icon: (
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
          <path d="M14 9h3V6h-3c-1.6 0-3 1.4-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
        </svg>
      ),
    },
    {
      key: "instagram",
      href: settings?.instagram_url,
      label: "Instagram",
      icon: (
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm0 7.2A2.7 2.7 0 1 1 14.7 12 2.7 2.7 0 0 1 12 14.7zM17.8 6.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1z" />
        </svg>
      ),
    },
    {
      key: "tiktok",
      href: settings?.tiktok_url,
      label: "TikTok",
      icon: (
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
          <path d="M19 8.2a6.6 6.6 0 0 1-3.8-1.2v7.1a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.5a2.8 2.8 0 1 0 2 2.7V3h2.5a4.1 4.1 0 0 0 3.7 3.7z" />
        </svg>
      ),
    },
    {
      key: "snapchat",
      href: settings?.snapchat_url,
      label: "Snapchat",
      icon: (
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
          <path d="M12.04 2c-2.8 0-4.9 2.06-4.9 5.05v.7c0 .2-.06.36-.36.5-.5.24-1.2.42-1.7.57-.66.2-.9.52-.9 1 0 .44.34.8.86 1.1.28.16.56.4.56.72 0 .34-.18.58-.5.84-.78.62-1.86 1.48-1.86 2.7 0 1.64 1.6 2.56 3.5 2.56.26 0 .5-.02.72-.04.34-.04.62.1.8.4.34.56.9 1.16 1.9 1.16.34 0 .66-.08.96-.22.34-.16.7-.16 1.04 0 .3.14.62.22.96.22 1 0 1.56-.6 1.9-1.16.18-.3.46-.44.8-.4.22.02.46.04.72.04 1.9 0 3.5-.92 3.5-2.56 0-1.22-1.08-2.08-1.86-2.7-.32-.26-.5-.5-.5-.84 0-.32.28-.56.56-.72.52-.3.86-.66.86-1.1 0-.48-.24-.8-.9-1-.5-.15-1.2-.33-1.7-.57-.3-.14-.36-.3-.36-.5v-.7C16.94 4.06 14.84 2 12.04 2z" />
        </svg>
      ),
    },
  ].filter((item) => !!item.href?.trim());

  return (
    <footer className="relative overflow-hidden border-t border-border/60">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(201_169_110_/_0.1),transparent_55%),linear-gradient(180deg,rgb(0_0_0_/_0.02),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20 lg:px-14 lg:py-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {/* Column 1 — Brand */}
          <FooterPanel delay={0}>
            <PanelHeading>{t(locale, "footer", "brand")}</PanelHeading>
            <Link href="/" className="group inline-flex max-w-full items-center gap-4">
              {settings?.company_logo ? (
                <span className="relative h-16 w-44 shrink-0 overflow-hidden rounded-[22px] border border-[var(--gold)]/25 bg-white/90 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.35)] dark:bg-white/95 sm:h-[4.5rem] sm:w-52">
                  <Image
                    src={settings.company_logo}
                    alt={companyName}
                    fill
                    className="object-contain p-2.5 transition duration-500 group-hover:scale-105"
                    sizes="208px"
                  />
                </span>
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-[22px] border border-[var(--gold)]/25 bg-[var(--gold)]/10 font-display text-2xl text-[var(--gold)]">
                  {companyName.slice(0, 1)}
                </span>
              )}
              <span className="font-display text-xl font-medium tracking-tight text-foreground transition group-hover:text-[var(--gold)] md:text-2xl">
                {companyName}
              </span>
            </Link>
            <p className="text-muted-foreground mt-5 line-clamp-2 text-sm leading-relaxed md:text-[15px]">
              {description}
            </p>
          </FooterPanel>

          {/* Column 2 — Location */}
          <FooterPanel delay={0.06}>
            <PanelHeading>{t(locale, "footer", "location")}</PanelHeading>
            {office && office.latitude != null && office.longitude != null ? (
              <div className="flex flex-1 flex-col gap-4">
                <LazyGoogleMap
                  latitude={office.latitude}
                  longitude={office.longitude}
                  title={office.name}
                  variant="preview"
                  className="min-h-[168px] rounded-[18px] border border-white/20 shadow-inner dark:border-white/10"
                />
                <div className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold)]" />
                  <p className="text-foreground/90">{addressLine}</p>
                </div>
                {directionsHref ? (
                  <ButtonLink
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="gold"
                    className="mt-auto h-11 rounded-[16px]"
                  >
                    <Navigation className="size-4" />
                    {t(locale, "location", "get_directions")}
                  </ButtonLink>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t(locale, "contact", "map_unavailable")}
              </p>
            )}
          </FooterPanel>

          {/* Column 3 — Contact cards */}
          <FooterPanel delay={0.12}>
            <PanelHeading>{t(locale, "footer", "contact")}</PanelHeading>
            <div className="flex flex-1 flex-col gap-3">
              <ContactMiniCard
                icon={<Phone className="size-4" />}
                title={t(locale, "location", "card_phone")}
              >
                <PhoneLinkList
                  fields={[settings?.phone_number]}
                  className="space-y-1"
                  showIcon={false}
                  itemClassName="text-sm font-medium text-foreground"
                />
                {!settings?.phone_number ? "—" : null}
              </ContactMiniCard>

              <ContactMiniCard
                icon={<MessageCircle className="size-4" />}
                title={t(locale, "common", "whatsapp")}
                href={waLink ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                {settings?.whatsapp_number ? (
                  <PhoneText phone={settings.whatsapp_number} />
                ) : (
                  "—"
                )}
              </ContactMiniCard>

              <ContactMiniCard
                icon={<Mail className="size-4" />}
                title={t(locale, "location", "card_email")}
                href={
                  primaryEmail ? `mailto:${primaryEmail.email}` : undefined
                }
              >
                {primaryEmail ? (
                  <span className="break-all">{primaryEmail.email}</span>
                ) : (
                  "—"
                )}
              </ContactMiniCard>
            </div>
          </FooterPanel>

          {/* Column 4 — Quick links */}
          <FooterPanel delay={0.18}>
            <PanelHeading>{t(locale, "footer", "quick_links")}</PanelHeading>
            <nav aria-label={t(locale, "footer", "quick_links")}>
              <ul className="space-y-1">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between rounded-[14px] px-3 py-2.5 text-sm text-foreground/85 transition duration-300 hover:bg-[var(--gold)]/10 hover:text-[var(--gold)]"
                    >
                      <span>
                        {link.key === "home"
                          ? t(locale, "footer", "home")
                          : t(locale, "nav", link.key)}
                      </span>
                      <span
                        className="text-[var(--gold)] opacity-0 transition group-hover:opacity-100"
                        aria-hidden
                      >
                        ↗
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </FooterPanel>
        </div>

        {/* Social row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-12 flex flex-col items-center gap-5 border-t border-border/50 pt-10"
        >
          <p className="text-showroom-accent text-[11px] tracking-[0.28em] uppercase">
            {t(locale, "footer", "follow")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {socials.length ? (
              socials.map((item) => (
                <SocialIcon
                  key={item.key}
                  href={item.href as string}
                  label={item.label}
                >
                  {item.icon}
                </SocialIcon>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                {t(locale, "footer", "social_empty")}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-border/60 bg-card/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-5 py-6 text-center md:flex-row md:px-10 md:text-start lg:px-14">
          <p className="text-muted-foreground text-xs tracking-wide">
            © {year} {companyName}. {t(locale, "footer", "rights")}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            <Link
              href="/privacy"
              className="text-muted-foreground transition hover:text-[var(--gold)]"
            >
              {t(locale, "footer", "privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground transition hover:text-[var(--gold)]"
            >
              {t(locale, "footer", "terms")}
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground/70 pb-5 text-center text-[11px] tracking-wide">
          {t(locale, "footer", "credit")}
        </p>
      </div>
    </footer>
  );
}
