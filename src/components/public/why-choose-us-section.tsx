"use client";

import {
  Award,
  Gem,
  Handshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { getSectionHeading } from "@/lib/showroom/content";
import type { HomepageContent } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";

const ICONS = [Gem, ShieldCheck, Sparkles, Award, Handshake, Users] as const;

type WhyChooseUsSectionProps = {
  homepage: HomepageContent | null;
  locale: Locale;
};

export function WhyChooseUsSection({ homepage, locale }: WhyChooseUsSectionProps) {
  const section = homepage?.why_choose_us?.[locale] ?? homepage?.why_choose_us?.ku;
  if (!section?.items?.length) return null;

  return (
    <section className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "common", "featured")}
          title={
            section.title ||
            getSectionHeading(
              homepage,
              locale,
              "why_us",
              t(locale, "sections", "why_us"),
            )
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {section.items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length];

            return (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: Math.min(index * 0.08, 0.32),
                }}
                className="showroom-card group p-8 md:p-10"
              >
                <span className="text-showroom-accent mb-6 inline-flex size-14 items-center justify-center rounded-[16px] bg-[var(--gold)]/12 transition-colors group-hover:bg-[var(--gold)]/20">
                  <Icon className="size-6" strokeWidth={1.5} />
                </span>
                <h3 className="font-display mb-3 text-xl font-medium md:text-2xl">
                  {item.title}
                </h3>
                <p className="text-showroom-muted text-sm leading-relaxed md:text-base">
                  {item.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
