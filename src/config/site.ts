export const siteConfig = {
  name: "Nova Home Decor CMS",
  description: "Content management system for Nova Home Decor",
  defaultLocale: "ku" as const,
  locales: ["ku", "ar", "en"] as const,
  rtlLocales: ["ku", "ar"] as const,
} as const;

export type Locale = (typeof siteConfig.locales)[number];
export type Direction = "ltr" | "rtl";
