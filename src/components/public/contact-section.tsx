"use client";

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import { formatOfficePublicSubtitle } from "@/lib/office-location";
import { showroomText } from "@/lib/showroom/content";
import type { HomepageContent, WebsiteSettings } from "@/types/database";
import type { OfficeLocation } from "@/types/office-location";
import { ContactGlassCard } from "@/components/public/contact-glass-card";
import { ContactMapPanel } from "@/components/public/contact-map-panel";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { PhoneLinkList, PhoneText } from "@/components/ui/phone-link";

type ContactSectionProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  locale: Locale;
  office: OfficeLocation | null;
};

export function ContactSection({
  settings,
  homepage,
  locale,
  office,
}: ContactSectionProps) {
  const contact = homepage?.contact?.[locale] ?? homepage?.contact?.ku;
  const waLink = whatsappLink(settings?.whatsapp_number);
  const addressSubtitle = office ? formatOfficePublicSubtitle(office) : "";
  const addressHref =
    office != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${office.latitude},${office.longitude}`
      : undefined;

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-5 py-20 md:px-10 md:py-28 lg:px-14"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(201_169_110_/_0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(74_85_48_/_0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "nav", "contact")}
          title={showroomText(
            contact?.title,
            t(locale, "contact_info", "title"),
          )}
          subtitle={showroomText(
            contact?.subtitle,
            t(locale, "contact_info", "subtitle"),
          )}
        />

        <div className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <ContactGlassCard
            icon={<Phone className="size-5" />}
            title={t(locale, "location", "card_phone")}
            delay={0}
          >
            <PhoneLinkList
              fields={[settings?.phone_number]}
              className="space-y-2"
              showIcon={false}
              itemClassName="text-sm text-foreground"
            />
            {!settings?.phone_number ? (
              <span className="text-muted-foreground/70">—</span>
            ) : null}
          </ContactGlassCard>

          <ContactGlassCard
            icon={<MessageCircle className="size-5" />}
            title={t(locale, "common", "whatsapp")}
            href={waLink ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            delay={0.06}
          >
            {settings?.whatsapp_number ? (
              <PhoneText phone={settings.whatsapp_number} />
            ) : (
              <span className="text-muted-foreground/70">—</span>
            )}
          </ContactGlassCard>

          <ContactGlassCard
            icon={<Mail className="size-5" />}
            title={t(locale, "location", "card_email")}
            delay={0.12}
          >
            {settings?.email_addresses?.length ? (
              <ul className="space-y-1.5">
                {settings.email_addresses.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`mailto:${entry.email}`}
                      className="transition hover:text-[var(--gold)]"
                    >
                      {entry.label ? `${entry.label}: ` : ""}
                      {entry.email}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground/70">—</span>
            )}
          </ContactGlassCard>

          <ContactGlassCard
            icon={<MapPin className="size-5" />}
            title={t(locale, "location", "card_address")}
            href={addressHref}
            target="_blank"
            rel="noopener noreferrer"
            delay={0.18}
          >
            {office ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">{office.name}</p>
                {addressSubtitle ? <p>{addressSubtitle}</p> : null}
              </div>
            ) : (
              <span className="text-muted-foreground/70">—</span>
            )}
          </ContactGlassCard>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="space-y-5"
          >
            <div className="showroom-glass rounded-[22px] border border-white/40 p-7 shadow-[0_18px_48px_-24px_rgb(47_47_47_/_0.28)] backdrop-blur-xl dark:border-white/10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 text-[var(--gold)]">
                  <Clock className="size-5" />
                </div>
                <h3 className="font-display text-xl font-medium">
                  {t(locale, "contact_hours", "title")}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
                {showroomText(
                  settings?.working_hours ?? contact?.hours,
                  t(locale, "contact_info", "hours"),
                )}
              </p>
            </div>

            <p className="text-muted-foreground px-1 text-sm leading-relaxed">
              {t(locale, "location", "trust_line")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            <ContactMapPanel office={office} locale={locale} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
