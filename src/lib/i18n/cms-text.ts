import type { Locale } from "@/config/site";
import type { ContentStringStore } from "@/types/content";
import { PROTECTED_CONTENT_KEYS } from "@/types/content";

const TEXT_OBJECT_KEYS = ["text", "message", "content", "html"] as const;
const LOCALE_KEYS = ["ku", "ar", "en"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when value is safe to pass to string methods like replace(). */
export function isPlainTextValue(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Coerce CMS / AI payloads to plain text without throwing.
 * Handles strings, localized objects, and common AI response shapes.
 */
export function coerceToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(coerceToText).filter(Boolean).join(" ");
  }
  if (!isRecord(value)) return "";

  for (const key of TEXT_OBJECT_KEYS) {
    if (key in value) {
      const extracted = coerceToText(value[key]);
      if (extracted) return extracted;
    }
  }

  for (const locale of LOCALE_KEYS) {
    if (locale in value) {
      const extracted = coerceToText(value[locale]);
      if (extracted) return extracted;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[cms-text] Could not coerce value to text:", value);
  }
  return "";
}

let requestOverrides: ContentStringStore | null = null;

/** Called once per public request from the layout. */
export function setRequestContentOverrides(store: ContentStringStore | null) {
  requestOverrides = store;
}

export function getRequestContentOverrides(): ContentStringStore | null {
  return requestOverrides;
}

export function lookupCmsValue(
  store: ContentStringStore | null | undefined,
  fullKey: string,
  locale: Locale,
): string | undefined {
  if (!store) return undefined;
  if (PROTECTED_CONTENT_KEYS.has(fullKey)) return undefined;

  const entry = store[fullKey];
  if (!entry) return undefined;

  const value =
    coerceToText(entry[locale]).trim() ||
    coerceToText(entry.ku).trim() ||
    coerceToText(entry.en).trim() ||
    coerceToText(entry.ar).trim();
  return value || undefined;
}

export function cmsT(
  locale: Locale,
  overrides: ContentStringStore | null | undefined,
  section: string,
  key: string,
  dictFallback: string,
): string {
  const fullKey = `${section}.${key}`;
  const cms = lookupCmsValue(overrides, fullKey, locale);
  return cms ?? dictFallback;
}

/** Strip HTML for plain-text previews and AI search indexing. */
export function stripHtml(html: unknown): string {
  const text = coerceToText(html);
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").trim();
}
