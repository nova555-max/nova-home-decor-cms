"use client";

import { motion } from "@/lib/motion";

import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  const { locale } = useDirection();

  return (
    <div data-showroom className="relative min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:px-10">
          <Skeleton className="size-11 rounded-[14px]" />
          <div className="hidden gap-6 md:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-16 rounded-full" />
            ))}
          </div>
          <Skeleton className="size-9 rounded-full md:hidden" />
        </div>
      </div>

      <div className="relative flex h-screen flex-col items-center justify-center">
        <Skeleton className="absolute inset-0 rounded-none" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4 px-5 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="size-14 rounded-full border-2 border-[var(--gold)] border-t-transparent"
          />
          <p className="font-display text-xl font-medium tracking-tight text-foreground">
            {t(locale, "loading", "title")}
          </p>
          <p className="text-showroom-muted text-sm">{t(locale, "loading", "subtitle")}</p>
        </motion.div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-24 px-5 py-20 md:px-10">
        <div className="space-y-4">
          <Skeleton className="mx-auto h-3 w-24 rounded-full" />
          <Skeleton className="mx-auto h-10 w-full max-w-md rounded-[20px]" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-[20px]" />
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-[20px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
