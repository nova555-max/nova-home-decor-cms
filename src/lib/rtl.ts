import type { Direction, Locale } from "@/config/site";

export function getDirectionForLocale(locale: Locale): Direction {
  return locale === "en" ? "ltr" : "rtl";
}

export function getSidebarSide(direction: Direction): "left" | "right" {
  return direction === "rtl" ? "right" : "left";
}

/** Dropdown/menu align relative to trigger — trailing edge in both directions */
export function getMenuAlign(direction: Direction): "start" | "end" {
  return direction === "rtl" ? "start" : "end";
}

export function getToastPosition(
  direction: Direction,
): "top-right" | "top-left" {
  return direction === "rtl" ? "top-left" : "top-right";
}

/** Body font — ku/ar use Noto Sans Arabic (self-hosted); optional local Kurdistan24 via CSS stack */
export function getFontClassForLocale(locale: Locale): string {
  if (locale === "en") return "font-english";
  if (locale === "ku") return "font-kurdish";
  return "font-arabic";
}

/** Locale switcher labels always use a script-capable font */
export function getLocaleLabelFontClass(locale: Locale): string {
  if (locale === "en") return "font-english";
  if (locale === "ku") return "font-kurdish";
  return "font-arabic";
}
