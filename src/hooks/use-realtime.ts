"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Realtime CMS refresh for authenticated admin sessions only.
 * Public anonymous Realtime subscriptions caused WebSocket spam/failures on Netlify
 * when tables were not published or RLS blocked anon.
 */
export function useRealtimeSync(enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || process.env.NODE_ENV === "development") {
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createClient> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 1000);
    };

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

    void (async () => {
      try {
        supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled || !session) {
          return;
        }

        channel = supabase.channel("cms-realtime-admin");

        for (const table of tables) {
          channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            scheduleRefresh,
          );
        }

        channel.subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn(
              "[realtime]",
              status,
              err?.message ??
                "WebSocket failed. Check Supabase Realtime is enabled and tables are in supabase_realtime publication.",
            );
          }
        });
      } catch (err) {
        console.warn(
          "[realtime] disabled:",
          err instanceof Error ? err.message : err,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, router]);
}

export function RealtimeSync({ enabled = true }: { enabled?: boolean }) {
  useRealtimeSync(enabled);
  return null;
}
