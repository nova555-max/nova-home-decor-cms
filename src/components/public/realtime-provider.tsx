"use client";

import { RealtimeSync } from "@/hooks/use-realtime";

export function PublicRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealtimeSync />
      {children}
    </>
  );
}
