import type { Locale } from "@/config/site";
import type { HomepageContent, SectionHeadings } from "@/types/database";

export function showroomText(
  cmsValue: string | undefined,
  fallback: string,
): string {
  const trimmed = cmsValue?.trim();
  return trimmed ? trimmed : fallback;
}

export function getSectionHeading(
  homepage: HomepageContent | null | undefined,
  locale: Locale,
  key: keyof SectionHeadings,
  fallback: string,
): string {
  const headings =
    homepage?.section_headings?.[locale] ?? homepage?.section_headings?.ku;
  return showroomText(headings?.[key], fallback);
}
