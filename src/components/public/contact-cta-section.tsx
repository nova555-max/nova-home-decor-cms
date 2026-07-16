"use client";

import { MessageCircle, Phone } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import { showroomText } from "@/lib/showroom/content";
import type { HomepageContent, WebsiteSettings } from "@/types/database";
import type { OfficeLocation } from "@/types/office-location";
import { OfficeAddressDisplay } from "@/components/public/office-address-display";
import { ButtonLink } from "@/components/ui/button-link";

type ContactCtaSectionProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  locale: Locale;
  office: OfficeLocation | null;
};

export function ContactCtaSection({
  settings,
  homepage,
  locale,
  office,
}: ContactCtaSectionProps) {
  const cta = homepage?.contact_cta?.[locale] ?? homepage?.contact_cta?.ku;
  const waLink = whatsappLink(settings?.whatsapp_number);
  const phone = settings?.phone_number;

  return (
    <section className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75 }}
        className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[20px] bg-primary px-8 py-16 text-primary-foreground shadow-soft-lg md:px-16 md:py-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,169,110,0.22),transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="text-showroom-accent mb-4 text-xs tracking-[0.28em] uppercase">
            {showroomText(cta?.eyebrow, t(locale, "nav", "contact"))}
          </p>
          <h2 className="font-display text-[clamp(2rem,1.5rem+2vw,3.5rem)] leading-tight font-medium tracking-tight">
            {showroomText(cta?.title, t(locale, "contact", "title"))}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/70 md:text-lg">
            {showroomText(cta?.subtitle, t(locale, "contact", "subtitle"))}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {phone ? (
              <ButtonLink
                href={`tel:${phone}`}
                variant="gold"
                className="rounded-[20px] px-8 py-6"
              >
                <Phone className="size-4" />
                {showroomText(cta?.cta, t(locale, "contact", "cta"))}
              </ButtonLink>
            ) : null}
            {waLink ? (
              <ButtonLink
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                className="rounded-full border-primary-foreground/30 bg-transparent px-8 py-6 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <MessageCircle className="size-4" />
                {t(locale, "common", "whatsapp")}
              </ButtonLink>
            ) : null}
          </div>

          {office ? (
            <div className="mt-10 flex justify-center">
              <OfficeAddressDisplay
                office={office}
                locale={locale}
                variant="cta"
                showHeading={false}
              />
            </div>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}
