import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";
import type { AiLocalizedResult } from "@/lib/ai/types";

export function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export function parseLocalizedJson(text: string): AiLocalizedResult {
  try {
    const parsed = JSON.parse(extractJsonBlock(text)) as Record<string, string>;
    const result: AiLocalizedResult = {};
    for (const locale of siteConfig.locales) {
      if (typeof parsed[locale] === "string") {
        result[locale as Locale] = parsed[locale];
      }
    }
    if (Object.keys(result).length > 0) return result;
  } catch {
    /* fall through */
  }
  return {};
}

export function parsePlainText(text: string): string {
  return text.trim().replace(/^["']|["']$/g, "");
}
