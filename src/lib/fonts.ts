import localFont from "next/font/local";

/**
 * Single system font: Rudaw (self-hosted for desktop + mobile).
 * One face for admin, public site, all locales and headings.
 */
export const fontRudaw = localFont({
  src: [
    {
      path: "../../public/fonts/rudaw/Rudaw-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/rudaw/Rudaw-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-rudaw",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Tahoma", "Segoe UI", "Arial", "sans-serif"],
});

/** Aliases — all point to Rudaw so legacy class names stay consistent */
export const fontEnglish = fontRudaw;
export const fontDisplay = fontRudaw;
export const fontArabic = fontRudaw;

export const fontVariables = fontRudaw.variable;
