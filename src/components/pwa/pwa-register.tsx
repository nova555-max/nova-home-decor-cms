"use client";

import { useEffect } from "react";

/**
 * Registers the public service worker in production only.
 * On /admin (or login), unregisters any active SW so CMS never gets stale chunks.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const path = window.location.pathname;
    const isAdminOrAuth =
      path.startsWith("/admin") ||
      path.startsWith("/login") ||
      path.startsWith("/auth");

    const recoverAdmin = async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith("nova-"))
            .map((k) => caches.delete(k)),
        );
      }
    };

    if (isAdminOrAuth) {
      void recoverAdmin();
      return;
    }

    // Avoid SW in local/dev — stale Turbopack chunks break admin after HMR.
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("[pwa] SW registration failed", error);
      }
    };

    void register();
  }, []);

  return null;
}
