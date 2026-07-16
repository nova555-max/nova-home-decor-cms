import type { Locale } from "@/config/site";

export type LocalizedText = Partial<Record<Locale, string>>;

export type LocalizedField<T = string> = Partial<Record<Locale, T>>;

export function localized(
  field: LocalizedText | null | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!field) return fallback;
  return field[locale] || field.ku || field.en || field.ar || fallback;
}

export const localeLabels: Record<Locale, string> = {
  ku: "کوردی",
  ar: "العربية",
  en: "English",
};

export const emptyLocalized = (): Record<Locale, string> => ({
  ku: "",
  ar: "",
  en: "",
});

export { dictionaries, t } from "@/lib/i18n/dictionaries";
