"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";

import { saveThemePreference } from "@/lib/actions/account";
import { withThemeTransition } from "@/lib/theme/transitions";
import type { AppTheme } from "@/lib/theme/config";

export function useThemeActions() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const applyTheme = useCallback(
    (next: AppTheme, options?: { persist?: boolean }) => {
      withThemeTransition(() => {
        setTheme(next);
      });

      if (options?.persist !== false) {
        void saveThemePreference(next);
      }
    },
    [setTheme],
  );

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    applyTheme(next);
  }, [applyTheme, resolvedTheme]);

  return {
    theme: (theme ?? "system") as AppTheme,
    resolvedTheme,
    applyTheme,
    toggleTheme,
  };
}
