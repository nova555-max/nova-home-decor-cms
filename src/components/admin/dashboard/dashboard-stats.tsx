"use client";

import { memo } from "react";
import {
  Briefcase,
  FolderTree,
  HardDrive,
  Images,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  DashboardCard,
  DashboardMotionSection,
} from "@/components/admin/dashboard/dashboard-primitives";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types/dashboard";
import { useDirection } from "@/hooks";

type DashboardStatsGridProps = {
  stats: DashboardStats;
};

const statConfig = [
  {
    key: "products",
    icon: Package,
    field: "products" as const,
    accent: "from-primary/15 to-primary/5",
    iconColor: "text-primary",
  },
  {
    key: "categories",
    icon: FolderTree,
    field: "categories" as const,
    accent: "from-gold/20 to-gold/5",
    iconColor: "text-gold",
  },
  {
    key: "projects",
    icon: Briefcase,
    field: "projects" as const,
    accent: "from-primary/12 to-transparent",
    iconColor: "text-primary",
  },
  {
    key: "gallery",
    icon: Images,
    field: "gallery" as const,
    accent: "from-gold/15 to-transparent",
    iconColor: "text-gold",
  },
  {
    key: "visitors",
    icon: Users,
    field: "visitors" as const,
    note: true,
    accent: "from-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    key: "storage",
    icon: HardDrive,
    field: "gallery" as const,
    storage: true,
    accent: "from-gold/12 to-transparent",
    iconColor: "text-gold",
  },
] as const;

export const DashboardStatsGrid = memo(function DashboardStatsGrid({
  stats,
}: DashboardStatsGridProps) {
  const { locale } = useDirection();

  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-label={td(locale, "stats.products")}
    >
      {statConfig.map((item, index) => {
        const { key, icon: Icon, field, accent, iconColor } = item;
        const note = "note" in item ? item.note : false;
        const storage = "storage" in item ? item.storage : false;

        return (
          <DashboardMotionSection key={key} delay={index * 0.04}>
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <DashboardCard
                hover
                padding="lg"
                className="group relative overflow-hidden"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                    accent,
                  )}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium tracking-wide text-muted-foreground">
                      {td(locale, `stats.${key}`)}
                    </p>
                    <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-foreground tabular-nums">
                      {stats[field]}
                    </p>
                    {note ? (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {td(locale, "stats.visitors_note")}
                      </p>
                    ) : storage ? (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {td(locale, "stats.storage_note")}
                      </p>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-primary">
                        <TrendingUp className="size-3" aria-hidden />
                        {td(locale, "stats.trend_active")}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card/80 shadow-sm transition-transform duration-300 group-hover:scale-105",
                      iconColor,
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                  </div>
                </div>
              </DashboardCard>
            </motion.div>
          </DashboardMotionSection>
        );
      })}
    </section>
  );
});
