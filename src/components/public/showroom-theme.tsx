"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { DEFAULT_SHOWROOM_THEME } from "@/lib/constants";
import type { ShowroomThemeColors, WebsiteSettings } from "@/types/database";

const SHOWROOM_VAR_MAP: Record<keyof ShowroomThemeColors, string> = {
  primary: "--showroom-primary",
  primary_hover: "--showroom-olive-dark",
  gold: "--showroom-accent",
  background: "--showroom-secondary",
  foreground: "--showroom-primary",
  muted: "--showroom-muted",
  border: "--showroom-border",
  card: "--showroom-card",
};

type ShowroomThemeProps = {
  settings: WebsiteSettings | null;
};

export function ShowroomTheme({ settings }: ShowroomThemeProps) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-showroom]");
    if (!el) return;

    if (resolvedTheme === "dark") {
      for (const cssVar of Object.values(SHOWROOM_VAR_MAP)) {
        el.style.removeProperty(cssVar);
      }
      return;
    }

    const colors: ShowroomThemeColors = {
      ...DEFAULT_SHOWROOM_THEME,
      ...(settings?.theme_colors ?? {}),
    };

    for (const [key, cssVar] of Object.entries(SHOWROOM_VAR_MAP)) {
      el.style.setProperty(cssVar, colors[key as keyof ShowroomThemeColors]);
    }
  }, [settings?.theme_colors, resolvedTheme]);

  return null;
}
