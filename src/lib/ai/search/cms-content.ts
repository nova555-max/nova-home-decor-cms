import type { Locale } from "@/config/site";
import type { ContentStringStore, LocalizedContentValue } from "@/types/content";
import type { HomepageContent, WebsiteSettings } from "@/types/database";
import { stripHtml } from "@/lib/i18n/cms-text";
import { localized } from "@/lib/i18n";

export type CmsContentMatch = {
  key: string;
  text: string;
  score: number;
};

export type CmsMenuMatch = {
  key: string;
  label: string;
  score: number;
};

const MENU_KEY_PREFIXES = ["nav.", "bottom_nav.", "sections."];

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,،.!?؛]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function scoreText(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 8;
  }
  return score;
}

function localizedPlainText(
  value: LocalizedContentValue | undefined,
  locale: Locale,
): string {
  if (!value) return "";
  const raw =
    value[locale] ?? value.en ?? value.ku ?? value.ar ?? "";
  return stripHtml(raw);
}

export function searchPublishedContent(
  store: ContentStringStore,
  locale: Locale,
  query: string,
): CmsContentMatch[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const matches: CmsContentMatch[] = [];
  for (const [key, value] of Object.entries(store)) {
    if (MENU_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    const text = localizedPlainText(value, locale);
    if (!text.trim()) continue;
    const score = scoreText(text, tokens) + (key.includes(".") ? 1 : 0);
    if (score >= 6) {
      matches.push({ key, text: text.slice(0, 200), score });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 8);
}

export function searchMenuContent(
  store: ContentStringStore,
  locale: Locale,
  query: string,
): CmsMenuMatch[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const matches: CmsMenuMatch[] = [];
  for (const [key, value] of Object.entries(store)) {
    if (!MENU_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    const label = localizedPlainText(value, locale);
    if (!label.trim()) continue;
    const score = scoreText(label, tokens);
    if (score >= 4) {
      matches.push({ key, label, score });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 10);
}

export type CmsHomepageMatch = {
  section: string;
  text: string;
  score: number;
};

export const CMS_UNAVAILABLE_MESSAGE =
  "This information is not available in the Nova Home Decor CMS.";

export function buildSettingsSearchContext(
  settings: WebsiteSettings | null,
  locale: Locale,
): string[] {
  if (!settings) return [];
  const lines = [
    settings.company_name,
    settings.seo_title,
    settings.seo_description,
    settings.company_address,
    settings.phone_number,
    settings.whatsapp_number,
    settings.facebook_url,
    settings.instagram_url,
  ].filter(Boolean) as string[];

  return lines.map((line) => line.slice(0, 160));
}

function collectLocalizedStrings(
  value: unknown,
  locale: Locale,
  prefix = "",
): Array<{ key: string; text: string }> {
  if (!value || typeof value !== "object") return [];
  const rows: Array<{ key: string; text: string }> = [];

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof nested === "string") {
      const text = stripHtml(nested);
      if (text.trim()) rows.push({ key: path, text });
      continue;
    }
    if (nested && typeof nested === "object") {
      if ("ku" in nested || "ar" in nested || "en" in nested) {
        const text = stripHtml(
          localized(nested as Record<Locale, string>, locale),
        );
        if (text.trim()) rows.push({ key: path, text });
      } else {
        rows.push(...collectLocalizedStrings(nested, locale, path));
      }
    }
  }

  return rows;
}

export function searchHomepageContent(
  homepage: HomepageContent | null,
  locale: Locale,
  query: string,
): CmsHomepageMatch[] {
  if (!homepage) return [];
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const sections = collectLocalizedStrings(homepage, locale);
  const matches: CmsHomepageMatch[] = [];

  for (const section of sections) {
    const score = scoreText(section.text, tokens);
    if (score >= 4) {
      matches.push({
        section: section.key,
        text: section.text.slice(0, 200),
        score,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 8);
}

export function hasCmsSearchHits(
  result: {
    products: unknown[];
    categories: unknown[];
    projects: unknown[];
    gallery: unknown[];
    contentStrings: unknown[];
    menuItems: unknown[];
    settingsContext: unknown[];
    homepageMatches?: unknown[];
  },
): boolean {
  return (
    result.products.length > 0 ||
    result.categories.length > 0 ||
    result.projects.length > 0 ||
    result.gallery.length > 0 ||
    result.contentStrings.length > 0 ||
    result.menuItems.length > 0 ||
    result.settingsContext.length > 0 ||
    (result.homepageMatches?.length ?? 0) > 0
  );
}
