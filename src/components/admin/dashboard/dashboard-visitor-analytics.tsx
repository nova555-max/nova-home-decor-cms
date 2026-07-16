"use client";

import { BarChart3, Globe2, Users } from "lucide-react";

import {
  DashboardCard,
  DashboardSection,
} from "@/components/admin/dashboard/dashboard-primitives";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { useDirection } from "@/hooks";

type VisitorAnalyticsProps = {
  visitors: number;
};

export function DashboardVisitorAnalytics({ visitors }: VisitorAnalyticsProps) {
  const { locale } = useDirection();

  return (
    <DashboardSection
      title={td(locale, "visitor_analytics")}
      description={td(locale, "analytics_not_configured")}
    >
      <DashboardCard padding="lg" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricPill
            icon={Users}
            label={td(locale, "stats.visitors")}
            value={String(visitors)}
            note={td(locale, "stats.visitors_note")}
          />
          <MetricPill
            icon={Globe2}
            label={td(locale, "analytics_countries")}
            value="—"
            note={td(locale, "analytics_not_configured")}
          />
        </div>

        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-background/60 px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card text-primary">
            <BarChart3 className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            {td(locale, "analytics_not_configured")}
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
            {td(locale, "analytics_demo_note")}
          </p>
        </div>
      </DashboardCard>
    </DashboardSection>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="size-4" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
