import type { Viewport } from "next";

/** Shared mobile-first viewport (safe-area friendly). */
export const appViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1F1B" },
  ],
  colorScheme: "light dark",
};
