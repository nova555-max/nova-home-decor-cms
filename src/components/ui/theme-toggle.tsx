"use client";

import { Moon, Sun } from "lucide-react";

import { useMounted } from "@/hooks";
import { useThemeActions } from "@/lib/theme/use-theme-actions";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useThemeActions();
  const mounted = useMounted();

  const dimension = size === "sm" ? "size-8" : "size-10";
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  if (!mounted) {
    return (
      <div
        className={cn(
          "border-border bg-card inline-flex rounded-full border",
          dimension,
          className,
        )}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={cn(
        "group border-border bg-card hover:border-gold/50 relative inline-flex items-center justify-center rounded-full border shadow-sm transition-[box-shadow,border-color] duration-300 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        dimension,
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-gold/0 transition-colors duration-300 group-hover:bg-gold/10"
        aria-hidden
      />
      <Sun
        className={cn(
          iconSize,
          "text-gold absolute transition-all duration-300 ease-out",
          isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Moon
        className={cn(
          iconSize,
          "text-gold absolute transition-all duration-300 ease-out",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
