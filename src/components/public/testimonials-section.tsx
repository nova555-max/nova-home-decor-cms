"use client";

import { Quote } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { localized, t } from "@/lib/i18n";
import { getSectionHeading } from "@/lib/showroom/content";
import type { HomepageContent, Testimonial } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";

type TestimonialsSectionProps = {
  items: Testimonial[];
  homepage: HomepageContent | null;
  locale: Locale;
};

export function TestimonialsSection({
  items,
  homepage,
  locale,
}: TestimonialsSectionProps) {
  if (!items.length) return null;

  return (
    <section className="bg-muted/50 px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={getSectionHeading(
            homepage,
            locale,
            "testimonials",
            t(locale, "sections", "testimonials"),
          )}
          title={getSectionHeading(
            homepage,
            locale,
            "testimonials",
            t(locale, "sections", "testimonials"),
          )}
          align="center"
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.65,
                delay: Math.min(index * 0.08, 0.32),
              }}
              className="showroom-card flex flex-col p-8 md:p-10"
            >
              <Quote className="text-showroom-accent mb-6 size-8 opacity-80" />
              <p className="text-showroom-muted mb-8 flex-1 text-base leading-relaxed md:text-lg">
                &ldquo;{localized(item.content_i18n, locale)}&rdquo;
              </p>
              <div className="border-t border-border pt-6">
                <p className="font-medium tracking-wide">
                  {localized(item.author_i18n, locale)}
                </p>
                <p className="text-showroom-muted mt-1 text-xs tracking-[0.18em] uppercase">
                  {localized(item.role_i18n, locale)}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
