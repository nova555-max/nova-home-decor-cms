"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import type { HomepageContent } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";

type AboutSectionProps = {
  homepage: HomepageContent | null;
  locale: Locale;
};

export function AboutSection({ homepage, locale }: AboutSectionProps) {
  const about = homepage?.about?.[locale] ?? homepage?.about?.ku;
  if (!about?.title && !about?.content) return null;

  return (
    <section id="about" className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <SectionHeading
              eyebrow={t(locale, "nav", "about")}
              title={about.title || t(locale, "sections", "about")}
              className="mb-6 md:mb-8"
            />
            <p className="text-showroom-muted max-w-xl text-base leading-relaxed whitespace-pre-line md:text-lg">
              {about.content}
            </p>
            <a
              href="#contact"
              className="text-showroom-accent mt-8 inline-flex items-center gap-2 text-sm font-medium tracking-[0.18em] uppercase transition hover:opacity-70"
            >
              {t(locale, "common", "get_in_touch")}
              <ArrowUpRight className="size-4" />
            </a>
          </motion.div>

          {about.image_url ? (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative aspect-[4/3] overflow-hidden rounded-[20px]"
            >
              <Image
                src={about.image_url}
                alt={about.title || t(locale, "sections", "about")}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
