"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import {
  categoryHasChildren,
  getDirectChildren,
  getRootCategories,
} from "@/lib/categories/tree";
import { t } from "@/lib/i18n";
import { getSectionHeading } from "@/lib/showroom/content";
import { categoryName, type Category, type HomepageContent } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { Button } from "@/components/ui/button";

type CategoriesShowcaseSectionProps = {
  categories: Category[];
  homepage: HomepageContent | null;
  locale: Locale;
  browseParentId: string | null;
  onSelectCategory?: (categoryId: string) => void;
  onBrowseBack?: () => void;
};

export function CategoriesShowcaseSection({
  categories,
  homepage,
  locale,
  browseParentId,
  onSelectCategory,
  onBrowseBack,
}: CategoriesShowcaseSectionProps) {
  const parent = browseParentId
    ? categories.find((c) => c.id === browseParentId) ?? null
    : null;
  const visible = browseParentId
    ? getDirectChildren(categories, browseParentId)
    : getRootCategories(categories);

  if (!categories.length) return null;
  if (!visible.length && !browseParentId) return null;

  const BackIcon = locale === "en" ? ArrowLeft : ArrowRight;

  return (
    <section id="categories" className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "common", "explore")}
          title={
            parent
              ? categoryName(parent, locale)
              : getSectionHeading(
                  homepage,
                  locale,
                  "categories",
                  t(locale, "sections", "categories"),
                )
          }
          subtitle={
            parent
              ? t(locale, "common", "choose_subcategory")
              : getSectionHeading(
                  homepage,
                  locale,
                  "categories_sub",
                  t(locale, "sections", "categories_sub"),
                )
          }
        />

        {parent ? (
          <div className="mb-8">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onBrowseBack?.()}
            >
              <BackIcon className="size-4" />
              {t(locale, "common", "back_to_categories")}
            </Button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-showroom-muted rounded-[20px] border border-dashed border-border p-16 text-center text-sm">
            {t(locale, "common", "no_items")}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {visible.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                locale={locale}
                index={index}
                hasChildren={categoryHasChildren(categories, category.id)}
                onSelect={() => {
                  onSelectCategory?.(category.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  locale,
  index,
  hasChildren,
  onSelect,
}: {
  category: Category;
  locale: Locale;
  index: number;
  hasChildren: boolean;
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
            {hasChildren
              ? t(locale, "common", "subcategories")
              : t(locale, "common", "explore")}
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
