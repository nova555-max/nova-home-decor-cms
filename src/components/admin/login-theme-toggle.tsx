"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export function LoginThemeToggle() {
  return (
    <div className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] z-10">
      <ThemeToggle />
    </div>
  );
}
