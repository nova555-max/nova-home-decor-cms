"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { getSectionHeading } from "@/lib/showroom/content";
import { categoryName, type Category, type HomepageContent } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";

type CategoriesShowcaseSectionProps = {
  categories: Category[];
  homepage: HomepageContent | null;
  locale: Locale;
  onSelectCategory?: (categoryId: string) => void;
};

export function CategoriesShowcaseSection({
  categories,
  homepage,
  locale,
  onSelectCategory,
}: CategoriesShowcaseSectionProps) {
  if (!categories.length) return null;

  return (
    <section id="categories" className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "common", "explore")}
          title={getSectionHeading(
            homepage,
            locale,
            "categories",
            t(locale, "sections", "categories"),
          )}
          subtitle={getSectionHeading(
            homepage,
            locale,
            "categories_sub",
            t(locale, "sections", "categories_sub"),
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              locale={locale}
              index={index}
              onSelect={() => {
                onSelectCategory?.(category.id);
                document.getElementById("products")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  locale,
  index,
  onSelect,
}: {
  category: Category;
  locale: Locale;
  index: number;
  onSelect: () => void;
}) {
  const name = categoryName(category, locale);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.65,
        delay: Math.min(index * 0.08, 0.32),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group showroom-card relative aspect-[4/5] w-full overflow-hidden text-start"
    >
      {category.image_url ? (
        <Image
          src={category.image_url}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 to-[var(--primary-hover)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 md:p-8">
        <div>
          <p className="text-showroom-accent mb-2 text-[10px] tracking-[0.28em] uppercase">
            {t(locale, "common", "explore")}
          </p>
          <h3 className="font-display text-2xl font-medium text-[var(--hero-overlay-fg)] md:text-3xl">
            {name}
          </h3>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-hero-overlay text-hero-overlay backdrop-blur-md transition group-hover:bg-[var(--gold)] group-hover:text-[var(--gold-foreground)]">
          <ArrowUpRight className="size-5" />
        </span>
      </div>
    </motion.button>
  );
}
