"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { withThemeTransition } from "@/lib/theme/transitions";
import type { AppTheme } from "@/lib/theme/config";

type ThemePreferenceSyncProps = {
  preferredTheme?: AppTheme | null;
};

const SYNC_FLAG = "nova-theme-user-synced";

export function ThemePreferenceSync({
  preferredTheme,
}: ThemePreferenceSyncProps) {
  const { setTheme } = useTheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!preferredTheme || syncedRef.current) return;
    if (typeof window === "undefined") return;

    const alreadySynced = sessionStorage.getItem(SYNC_FLAG);
    if (alreadySynced) return;

    withThemeTransition(() => {
      setTheme(preferredTheme);
    });

    sessionStorage.setItem(SYNC_FLAG, "1");
    syncedRef.current = true;
  }, [preferredTheme, setTheme]);

  return null;
}
