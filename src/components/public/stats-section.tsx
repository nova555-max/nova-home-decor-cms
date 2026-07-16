"use client";

import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { showroomText } from "@/lib/showroom/content";
import type { HomepageContent } from "@/types/database";
import { AnimatedCounter } from "@/components/public/showroom/animated-counter";
import { SectionHeading } from "@/components/public/showroom/section-heading";

type StatsSectionProps = {
  homepage: HomepageContent | null;
  locale: Locale;
};

const DEFAULT_STAT_KEYS = [
  "years",
  "projects",
  "customers",
  "satisfaction",
] as const;

const DEFAULT_STAT_VALUES = [
  { value: 15, suffix: "+" },
  { value: 350, suffix: "+" },
  { value: 1200, suffix: "+" },
  { value: 98, suffix: "%" },
] as const;

export function StatsSection({ homepage, locale }: StatsSectionProps) {
  const cms = homepage?.stats?.[locale] ?? homepage?.stats?.ku;

  const items =
    cms?.items?.length === 4
      ? cms.items
      : DEFAULT_STAT_KEYS.map((key, index) => ({
          label: t(locale, "stats", key),
          value: DEFAULT_STAT_VALUES[index].value,
          suffix: DEFAULT_STAT_VALUES[index].suffix,
        }));

  return (
    <section id="stats" className="border-y border-border bg-card px-5 py-16 md:px-10 md:py-20 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={showroomText(cms?.eyebrow, t(locale, "stats", "eyebrow"))}
          title={showroomText(cms?.title, t(locale, "stats", "title"))}
          align="center"
          className="mb-10 md:mb-14"
        />

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {items.map((stat, index) => (
            <motion.div
              key={`${stat.label}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="text-center"
            >
              <p className="font-display text-[clamp(2.5rem,2rem+2vw,3.5rem)] font-medium leading-none text-primary">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={2.2}
                />
              </p>
              <p className="text-showroom-muted mt-3 text-sm tracking-wide md:text-base">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
