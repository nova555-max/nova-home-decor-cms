"use client";

import { siteConfig, type Locale } from "@/config/site";
import { localeLabels } from "@/lib/i18n";
import { getLocaleLabelFontClass } from "@/lib/rtl";
import { useDirection } from "@/hooks";
import { cn } from "@/lib/utils";

const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ku: "rtl",
  ar: "rtl",
  en: "ltr",
};

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useDirection();

  return (
    <div
      className={cn(
        "border-border flex items-center gap-1 rounded-lg border p-1",
        className,
      )}
      role="group"
      aria-label="Language"
      suppressHydrationWarning
    >
      {siteConfig.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          dir={localeDirection[loc]}
          className={cn(
            "min-h-11 min-w-[4.5rem] rounded-md px-2.5 py-1 text-xs font-medium transition-colors md:min-h-0",
            getLocaleLabelFontClass(loc),
            locale === loc
              ? "bg-[var(--gold)] text-[var(--gold-foreground)]"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={locale === loc}
          suppressHydrationWarning
        >
          <span suppressHydrationWarning>{localeLabels[loc]}</span>
        </button>
      ))}
    </div>
  );
}
