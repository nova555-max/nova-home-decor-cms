"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function useRealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    const supabase = createClient();
    const tables = [
      "website_settings",
      "homepage_content",
      "testimonials",
      "categories",
      "products",
      "projects",
      "gallery_items",
      "website_content_strings",
    ] as const;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 1000);
    };

    const channel = supabase.channel("cms-realtime");

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    });

    channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router]);
}

export function RealtimeSync() {
  useRealtimeSync();
  return null;
}
