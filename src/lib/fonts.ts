import { Cormorant_Garamond, Inter, Noto_Sans_Arabic } from "next/font/google";

export const fontEnglish = Inter({
  variable: "--font-english",
  subsets: ["latin"],
  display: "swap",
});

export const fontDisplay = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const fontArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const fontVariables = [
  fontEnglish.variable,
  fontDisplay.variable,
  fontArabic.variable,
].join(" ");
