"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import {
  colorsForPreset,
  resolvePresetIdFromColors,
} from "@/lib/theme/showroom-presets";
import type { ShowroomThemeColors, WebsiteSettings } from "@/types/database";

const SHOWROOM_VAR_MAP: Array<{
  key: keyof ShowroomThemeColors;
  vars: string[];
}> = [
  { key: "primary", vars: ["--showroom-olive", "--primary"] },
  { key: "primary_hover", vars: ["--showroom-olive-dark", "--primary-hover"] },
  { key: "gold", vars: ["--showroom-accent", "--gold"] },
  { key: "background", vars: ["--showroom-secondary", "--background"] },
  { key: "foreground", vars: ["--showroom-primary", "--foreground"] },
  { key: "muted", vars: ["--showroom-muted", "--muted-foreground"] },
  { key: "border", vars: ["--showroom-border", "--border"] },
  { key: "card", vars: ["--showroom-card", "--card"] },
];

type ShowroomThemeProps = {
  settings: WebsiteSettings | null;
};

export function ShowroomTheme({ settings }: ShowroomThemeProps) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-showroom]");
    if (!el) return;

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const presetId = resolvePresetIdFromColors(settings?.theme_colors);
    const applied = colorsForPreset(presetId, mode);

    for (const { key, vars } of SHOWROOM_VAR_MAP) {
      const value = applied[key];
      if (typeof value !== "string" || !value) continue;
      for (const cssVar of vars) {
        el.style.setProperty(cssVar, value);
      }
    }

    el.style.setProperty("--card-foreground", applied.foreground);
  }, [settings?.theme_colors, resolvedTheme]);

  return null;
}
