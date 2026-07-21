"use client";

/**
 * Public pages no longer open Realtime WebSockets.
 * Anonymous Realtime caused connection failures and console noise on Netlify.
 * Admin realtime lives in AdminShell via RealtimeSync.
 */
export function PublicRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
