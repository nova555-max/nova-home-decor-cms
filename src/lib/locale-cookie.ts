import type { Locale } from "@/config/site";

export const LOCALE_COOKIE_NAME = "nova-locale";

const LOCALES: Locale[] = ["ku", "ar", "en"];

export function parseLocale(value: string | undefined | null): Locale | null {
  if (!value) return null;
  return LOCALES.includes(value as Locale) ? (value as Locale) : null;
}

export function resolveLocale(
  cookieValue: string | undefined | null,
  fallback: Locale,
): Locale {
  return parseLocale(cookieValue) ?? fallback;
}
