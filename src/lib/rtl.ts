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

/** Body font — Kurdish Sorani uses Arabic script via Noto Sans Arabic */
export function getFontClassForLocale(locale: Locale): string {
  return locale === "en" ? "font-english" : "font-arabic";
}

/** Locale switcher labels always use a script-capable font */
export function getLocaleLabelFontClass(locale: Locale): string {
  return locale === "en" ? "font-english" : "font-arabic";
}
