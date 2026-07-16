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

/** Entire CMS + public site uses one Rudaw font stack */
export function getFontClassForLocale(_locale: Locale): string {
  return "font-rudaw";
}

/** Locale switcher labels — same Rudaw system font */
export function getLocaleLabelFontClass(_locale: Locale): string {
  return "font-rudaw";
}
