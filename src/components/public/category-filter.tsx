"use client";

import { motion } from "@/lib/motion";
import type { Locale } from "@/config/site";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { categoryName, type Category } from "@/types/database";

type CategoryFilterProps = {
  categories: Category[];
  locale: Locale;
  activeId: string | null;
  onSelect: (categoryId: string | null) => void;
  className?: string;
  variant?: "default" | "luxury";
};

export function CategoryFilter({
  categories,
  locale,
  activeId,
  onSelect,
  className,
  variant = "default",
}: CategoryFilterProps) {
  const allLabel = t(locale, "common", "all_categories");
  const isLuxury = variant === "luxury";

  return (
    <div className={cn("w-full", className)}>
      <div className="scrollbar-hide flex flex-wrap items-center justify-center gap-3">
        <FilterPill
          label={allLabel}
          isActive={activeId === null}
          onClick={() => onSelect(null)}
          luxury={isLuxury}
        />
        {categories.map((category) => (
          <FilterPill
            key={category.id}
            label={categoryName(category, locale)}
            isActive={activeId === category.id}
            onClick={() => onSelect(category.id)}
            luxury={isLuxury}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  isActive,
  onClick,
  luxury,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  luxury?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "relative inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-6 py-2.5",
        "text-xs font-medium tracking-[0.18em] uppercase whitespace-nowrap",
        "transition-colors duration-300 ease-out",
        "focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40 focus-visible:outline-none",
        luxury
          ? cn(
              "border border-border bg-card",
              isActive
                ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-foreground)]"
                : "text-muted-foreground hover:border-[var(--gold)]/50 hover:text-[var(--gold)]",
            )
          : cn(
              "border-foreground/25 bg-background text-foreground hover:border-foreground/50",
              isActive && "border-foreground text-background",
            ),
      )}
      aria-pressed={isActive}
    >
      {isActive && !luxury ? (
        <motion.span
          layoutId="category-filter-active"
          className="bg-foreground absolute inset-0 rounded-full"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
