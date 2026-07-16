"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useDirection, useMounted } from "@/hooks";
import type { AdminContext } from "@/types/admin";
import type { SearchItem } from "@/types/dashboard";

type DashboardHeaderProps = {
  adminContext: AdminContext;
  /** Kept for caller compatibility — search lives in AdminHeader only. */
  searchItems?: SearchItem[];
};

export function DashboardHeader({
  adminContext,
}: DashboardHeaderProps) {
  const { locale, isRtl } = useDirection();
  const mounted = useMounted();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName =
    adminContext.email?.split("@")[0] ?? td(locale, "profile");

  const dateLabel = useMemo(() => {
    if (!mounted || !now) return "";
    const localeTag =
      locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : "en-US";
    try {
      return new Intl.DateTimeFormat(localeTag, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now);
    } catch {
      return now.toLocaleDateString();
    }
  }, [locale, mounted, now]);

  const timeLabel = useMemo(() => {
    if (!mounted || !now) return "";
    const localeTag =
      locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : "en-US";
    try {
      return new Intl.DateTimeFormat(localeTag, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
    } catch {
      return now.toLocaleTimeString();
    }
  }, [locale, mounted, now]);

  const openAiAssistant = () => {
    const aiPanel = document.getElementById("dashboard-ai");
    aiPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    const trigger = document.querySelector<HTMLButtonElement>(
      "[data-ai-chat-trigger]",
    );
    trigger?.click();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-[22px] border border-border bg-background shadow-[0_8px_32px_-12px_rgba(107,122,61,0.12)]"
      aria-label={td(locale, "welcome")}
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-gold/[0.05] to-transparent"
          aria-hidden
        />
        <div className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -start-10 size-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative space-y-6 p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
                {td(locale, "brand_label")}
              </p>
              <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.15rem] sm:leading-tight">
                {locale === "en"
                  ? `${td(locale, "welcome")}, ${displayName}`
                  : `${td(locale, "welcome")}، ${displayName}`}{" "}
                <span aria-hidden>👋</span>
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                {td(locale, "subtitle")}
              </p>
              <div
                className={cn(
                  "flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
                  !mounted && "opacity-0",
                )}
                aria-live="polite"
              >
                <span className="font-medium text-foreground/80">{dateLabel}</span>
                <span className="hidden h-3 w-px bg-border sm:inline-block" />
                <span
                  className="font-mono tabular-nums tracking-wide text-primary"
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  {timeLabel}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={openAiAssistant}
              className="h-11 shrink-0 gap-2 rounded-xl border-border bg-card/90 px-4 text-primary shadow-sm hover:border-primary/40"
              aria-label={td(locale, "ai_assistant")}
            >
              <Bot className="size-4" />
              <span className="text-sm font-medium">
                {td(locale, "ai_assistant")}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
