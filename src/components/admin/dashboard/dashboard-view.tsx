"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  dashboardContainer,
  dashboardItem,
} from "@/components/admin/dashboard/dashboard-motion";
import { DashboardHeader } from "@/components/admin/dashboard/dashboard-header";
import { DashboardPanelsSkeleton } from "@/components/admin/dashboard/dashboard-panels-skeleton";
import { DashboardQuickActions } from "@/components/admin/dashboard/dashboard-quick-actions";
import { DashboardAiPanel } from "@/components/admin/dashboard/dashboard-ai-panel";
import { DashboardStatsGrid } from "@/components/admin/dashboard/dashboard-stats";
import { DashboardVisitorAnalytics } from "@/components/admin/dashboard/dashboard-visitor-analytics";
import { DashboardSystemStatus } from "@/components/admin/dashboard/dashboard-system-status";
import { motion } from "@/lib/motion";
import type { DashboardData } from "@/types/dashboard";
import type { AdminContext } from "@/types/admin";

const DashboardPanels = dynamic(
  () =>
    import("@/components/admin/dashboard/dashboard-panels").then((m) => ({
      default: m.DashboardPanels,
    })),
  { loading: () => <DashboardPanelsSkeleton /> },
);

type DashboardViewProps = {
  data: DashboardData;
  adminContext: AdminContext;
};

export function DashboardView({ data, adminContext }: DashboardViewProps) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Alt+Shift+letter — never Ctrl/Cmd (those conflict with Save/Copy/Print).
      if (!event.altKey || !event.shiftKey) return;
      if (event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const routes: Record<string, string> = {
        p: "/admin/products",
        c: "/admin/categories",
        g: "/admin/gallery",
        s: "/admin/settings",
      };
      if (routes[key]) {
        event.preventDefault();
        router.push(routes[key]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <motion.div
      variants={dashboardContainer}
      initial={false}
      animate="show"
      className="space-y-8 bg-background/40 pb-10"
    >
      <motion.div variants={dashboardItem}>
        <DashboardHeader
          adminContext={adminContext}
          searchItems={data.searchItems}
        />
      </motion.div>

      <motion.div variants={dashboardItem}>
        <DashboardStatsGrid stats={data.stats} />
      </motion.div>

      <motion.div variants={dashboardItem}>
        <DashboardQuickActions />
      </motion.div>

      <motion.div variants={dashboardItem}>
        <DashboardAiPanel />
      </motion.div>

      <motion.div variants={dashboardItem} className="grid gap-6 xl:grid-cols-2">
        <DashboardVisitorAnalytics visitors={data.stats.visitors} />
        <DashboardSystemStatus
          systemStatus={data.systemStatus}
          settings={data.settings}
        />
      </motion.div>

      <motion.div variants={dashboardItem} className="space-y-6">
        <Suspense fallback={<DashboardPanelsSkeleton />}>
          <DashboardPanels data={data} />
        </Suspense>
      </motion.div>
    </motion.div>
  );
}
