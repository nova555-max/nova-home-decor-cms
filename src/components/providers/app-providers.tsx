"use client";

import { DirectionProvider } from "@/components/providers/direction-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { type Locale } from "@/config/site";

type AppProvidersProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
};

export function AppProviders({ children, initialLocale }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <DirectionProvider initialLocale={initialLocale}>
          {children}
        </DirectionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
