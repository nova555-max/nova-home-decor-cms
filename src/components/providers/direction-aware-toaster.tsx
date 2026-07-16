"use client";

import { Toaster } from "@/components/ui/sonner";
import { useDirection } from "@/hooks";
import { getToastPosition } from "@/lib/rtl";

export function DirectionAwareToaster() {
  const { direction } = useDirection();

  return (
    <Toaster
      richColors
      closeButton
      position={getToastPosition(direction)}
      dir={direction}
    />
  );
}
