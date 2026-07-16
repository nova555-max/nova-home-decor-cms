import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/config/site";
import {
  PROTECTED_CONTENT_KEYS,
  type ContentAdminSection,
  type ContentEntryMeta,
  type ContentFieldType,
  type ContentStringStore,
  type LocalizedContentValue,
} from "@/types/content";

function flattenDict(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else if (value && typeof value === "object") {
      Object.assign(out, flattenDict(value as Record<string, unknown>, path));
    }
  }
  return out;
}

/** Maps dictionary path prefix to admin section */
function sectionForKey(fullKey: string): ContentAdminSection {
  const [root, second] = fullKey.split(".");

  if (fullKey.startsWith("footer.newsletter")) return "newsletter";
  if (root === "footer") return "footer";
  if (root === "hero") return "home";
  if (root === "nav" || root === "bottom_nav") return "navigation";
  if (root === "not_found") return "errors";
  if (root === "loading") return "loading";
  if (root === "ai") return "ai";
  if (root === "stats") return "statistics";
  if (root === "quote") return "cta";
  if (root === "contact" || root === "contact_info" || root === "contact_hours") {
    return "contact";
  }
  if (root === "pwa") return "language_strings";

  if (root === "sections") {
    if (second === "categories" || second === "categories_sub") return "categories";
    if (second === "products" || second === "featured" || second === "latest") {
      return "products";
    }
    if (second === "projects") return "projects";
    if (second === "gallery") return "gallery";
    if (second === "about") return "about";
    if (second === "why_us" || second === "testimonials") return "testimonials";
    return "home";
  }

  if (root === "projects") return "projects";

  if (root === "common") {
    if (
      ["view", "explore", "search", "close", "share", "favorite", "unfavorite"].includes(
        second ?? "",
      )
    ) {
      return "buttons";
    }
    if (second === "no_items") return "empty_states";
    return "buttons";
  }

  if (root === "wishlist" || root === "search_page") {
    if (fullKey.includes("placeholder")) return "placeholders";
    if (fullKey.includes("empty") || fullKey.includes("no_results")) {
      return "empty_states";
    }
    return "language_strings";
  }

  if (fullKey.includes("placeholder")) return "placeholders";

  return "language_strings";
}

function fieldTypeForKey(fullKey: string): ContentFieldType {
  if (fullKey.includes("description") || fullKey.includes("content")) {
    return "rich";
  }
  return "text";
}

function humanLabel(fullKey: string): string {
  return fullKey
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" · ");
}

const kuFlat = flattenDict(dictionaries.ku as Record<string, unknown>);

/** Skip admin panel labels and protected copyright */
const SKIP_PREFIXES = ["admin."];

export const CONTENT_REGISTRY: ContentEntryMeta[] = Object.keys(kuFlat)
  .filter((key) => {
    if (PROTECTED_CONTENT_KEYS.has(key)) return false;
    if (SKIP_PREFIXES.some((p) => key.startsWith(p))) return false;
    return true;
  })
  .sort()
  .map((key) => {
    const [dictSection, ...rest] = key.split(".");
    return {
      key,
      section: sectionForKey(key),
      dictSection,
      dictKey: rest.join("."),
      label: humanLabel(key),
      fieldType: fieldTypeForKey(key),
      protected: false,
    };
  });

export function buildDefaultContentStore(): ContentStringStore {
  const store: ContentStringStore = {};
  for (const entry of CONTENT_REGISTRY) {
    const value: LocalizedContentValue = {};
    for (const locale of ["ku", "ar", "en"] as Locale[]) {
      const dict = dictionaries[locale] as Record<string, unknown>;
      const parts = entry.key.split(".");
      let current: unknown = dict[parts[0]];
      for (let i = 1; i < parts.length; i += 1) {
        if (current == null || typeof current !== "object") break;
        current = (current as Record<string, unknown>)[parts[i]];
      }
      if (typeof current === "string") {
        value[locale] = current;
      }
    }
    store[entry.key] = value;
  }
  return store;
}

export function getRegistryEntry(key: string): ContentEntryMeta | undefined {
  return CONTENT_REGISTRY.find((e) => e.key === key);
}

export function filterRegistry(options: {
  section?: ContentAdminSection | "all";
  query?: string;
}): ContentEntryMeta[] {
  const q = options.query?.trim().toLowerCase();
  return CONTENT_REGISTRY.filter((entry) => {
    if (options.section && options.section !== "all" && entry.section !== options.section) {
      return false;
    }
    if (!q) return true;
    return (
      entry.key.toLowerCase().includes(q) ||
      entry.label.toLowerCase().includes(q)
    );
  });
}

export function mergeContentStores(
  base: ContentStringStore,
  patch: ContentStringStore,
): ContentStringStore {
  return { ...base, ...patch };
}

export function countDraftChanges(
  drafts: ContentStringStore,
  published: ContentStringStore,
): number {
  let count = 0;
  for (const entry of CONTENT_REGISTRY) {
    for (const locale of ["ku", "ar", "en"] as Locale[]) {
      const d = drafts[entry.key]?.[locale] ?? "";
      const p = published[entry.key]?.[locale] ?? "";
      if (d !== p) count += 1;
    }
  }
  return count;
}
