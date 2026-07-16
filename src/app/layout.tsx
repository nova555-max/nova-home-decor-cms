import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppProviders } from "@/components/providers";
import { DirectionAwareToaster } from "@/components/providers/direction-aware-toaster";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/locale-cookie";
import { appViewport } from "@/lib/pwa/viewport";
import { getDirectionForLocale, getFontClassForLocale } from "@/lib/rtl";
import { fontRudaw, fontVariables } from "@/lib/fonts";
import { themeFoocScript } from "@/lib/theme/fooc-script";

import "./globals.css";

export const viewport = appViewport;

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nova",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    env.NEXT_PUBLIC_DEFAULT_LOCALE,
  );
  const initialDirection = getDirectionForLocale(initialLocale);
  const initialFontClass = getFontClassForLocale(initialLocale);

  return (
    <html lang={initialLocale} dir={initialDirection} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeFoocScript }} />
      </head>
      <body
        dir={initialDirection}
        className={`${fontVariables} ${fontRudaw.className} ${initialFontClass} antialiased`}
      >
        <AppProviders initialLocale={initialLocale}>
          <TooltipProvider>
            {children}
            <PwaRegister />
            <DirectionAwareToaster />
          </TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
