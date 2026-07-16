"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LuxuryButtonProps = ComponentProps<typeof Button>;

export function LuxuryButton({ className, children, ...props }: LuxuryButtonProps) {
  return (
    <Button
      variant="gold"
      className={cn(
        "rounded-[20px] px-8 shadow-soft transition-all duration-300 hover:scale-[1.03] hover:shadow-soft-lg active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
