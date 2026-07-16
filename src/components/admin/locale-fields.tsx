"use client";

import { useState } from "react";

import { AiAssistMenu } from "@/components/admin/ai-assist-menu";
import { siteConfig, type Locale } from "@/config/site";
import { localeLabels } from "@/lib/i18n";
import type { AiAdminTask, AiGenerateContext } from "@/lib/ai/types";
import { getLocaleLabelFontClass } from "@/lib/rtl";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/hooks";

type LocaleTabsProps = {
  activeLocale: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
};

export function LocaleTabs({
  activeLocale,
  onChange,
  className,
}: LocaleTabsProps) {
  const t = useAdminT();

  return (
    <div
      className={cn("flex flex-wrap gap-1", className)}
      role="group"
      aria-label={t("common.content_language")}
      suppressHydrationWarning
    >
      {siteConfig.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
          dir={locale === "en" ? "ltr" : "rtl"}
          aria-pressed={activeLocale === locale}
          suppressHydrationWarning
          className={cn(
            "min-h-11 min-w-[4.5rem] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors md:min-h-0",
            getLocaleLabelFontClass(locale),
            activeLocale === locale
              ? "bg-[var(--gold)] text-[var(--gold-foreground)]"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          <span suppressHydrationWarning>{localeLabels[locale]}</span>
        </button>
      ))}
    </div>
  );
}

type LocalizedInputProps = {
  label: string;
  value: Record<Locale, string>;
  onChange: (value: Record<Locale, string>) => void;
  multiline?: boolean;
  aiTask?: AiAdminTask;
  aiContext?: Omit<AiGenerateContext, "existingText">;
};

export function LocalizedInput({
  label,
  value,
  onChange,
  multiline = false,
  aiTask,
  aiContext,
}: LocalizedInputProps) {
  const [locale, setLocale] = useState<Locale>("ku");
  const InputTag = multiline ? "textarea" : "input";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex items-center gap-2">
          {aiTask ? (
            <AiAssistMenu
              task={aiTask}
              locale={locale}
              multiline={multiline}
              context={{
                ...aiContext,
                fieldLabel: label,
                existingText: value[locale] || Object.values(value).find(Boolean),
              }}
              onApply={(next) =>
                onChange({
                  ku: next.ku ?? value.ku ?? "",
                  ar: next.ar ?? value.ar ?? "",
                  en: next.en ?? value.en ?? "",
                })
              }
            />
          ) : null}
          <LocaleTabs activeLocale={locale} onChange={setLocale} />
        </div>
      </div>
      <InputTag
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-10 w-full rounded-[12px] border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        value={value[locale] ?? ""}
        rows={multiline ? 4 : undefined}
        dir={locale === "en" ? "ltr" : "rtl"}
        onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
      />
    </div>
  );
}
