"use client";

import { Clock, Mail, MessageCircle } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import { showroomText } from "@/lib/showroom/content";
import type { HomepageContent, WebsiteSettings } from "@/types/database";
import type { OfficeLocation } from "@/types/office-location";
import { OfficeAddressDisplay } from "@/components/public/office-address-display";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { PhoneLinkList, PhoneText } from "@/components/ui/phone-link";
import { cn } from "@/lib/utils";

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

  return (
    <section id="contact" className="bg-muted/40 px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
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

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            <div className="showroom-card space-y-6 border border-border bg-card p-8">
              <h3 className="font-display text-xl font-medium">
                {t(locale, "footer", "contact")}
              </h3>

              <div className="space-y-4 text-sm">
                <PhoneLinkList
                  fields={[settings?.phone_number]}
                  className="space-y-4"
                  iconClassName="text-[var(--gold)] opacity-100"
                />

                {settings?.email_addresses?.map((entry) => (
                  <a
                    key={entry.id}
                    href={`mailto:${entry.email}`}
                    className="flex items-center gap-3 transition hover:text-[var(--gold)]"
                  >
                    <Mail className="size-4 shrink-0 text-[var(--gold)]" />
                    {entry.label ? `${entry.label}: ` : ""}
                    {entry.email}
                  </a>
                ))}

                {waLink ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="inline-flex items-center gap-2.5 transition hover:text-[var(--gold)]"
                    style={{ unicodeBidi: "plaintext" }}
                  >
                    <MessageCircle className="size-4 shrink-0 text-[var(--gold)]" />
                    <span>{t(locale, "common", "whatsapp")}</span>
                    {settings?.whatsapp_number ? (
                      <span className="text-muted-foreground">
                        · <PhoneText phone={settings.whatsapp_number} />
                      </span>
                    ) : null}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="showroom-card border border-border bg-card p-8">
              <div className="mb-4 flex items-center gap-3">
                <Clock className="size-5 text-[var(--gold)]" />
                <h3 className="font-display text-xl font-medium">
                  {t(locale, "contact_hours", "title")}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {showroomText(
                  settings?.working_hours ?? contact?.hours,
                  t(locale, "contact_info", "hours"),
                )}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className={cn(
              "showroom-card flex min-h-[360px] flex-col justify-center border border-border bg-card p-8",
              !office && "items-center justify-center",
            )}
          >
            {office ? (
              <OfficeAddressDisplay office={office} locale={locale} />
            ) : (
              <p className="text-showroom-muted px-4 text-center text-sm">
                {t(locale, "contact", "map_unavailable")}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
