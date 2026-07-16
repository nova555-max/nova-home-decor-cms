"use client";

import {
  Bell,
  Bot,
  Database,
  HardDrive,
  Mail,
  Server,
  Shield,
} from "lucide-react";

import {
  DashboardCard,
  DashboardSection,
} from "@/components/admin/dashboard/dashboard-primitives";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@/types/dashboard";
import type { WebsiteSettings } from "@/types/database";
import { useDirection } from "@/hooks";

type DashboardSystemStatusProps = {
  systemStatus: SystemStatus;
  settings: WebsiteSettings | null;
};

export function DashboardSystemStatus({
  systemStatus,
  settings,
}: DashboardSystemStatusProps) {
  const { locale } = useDirection();
  const emailConfigured = Boolean(settings?.email_addresses?.[0]?.email);

  const rows = [
    {
      label: td(locale, "system.supabase"),
      ok: systemStatus.supabaseConnected,
      okText: td(locale, "system.connected"),
      badText: td(locale, "system.disconnected"),
      icon: Server,
    },
    {
      label: td(locale, "system.storage"),
      ok: systemStatus.storageConnected,
      okText: td(locale, "system.connected"),
      badText: td(locale, "system.disconnected"),
      icon: HardDrive,
    },
    {
      label: td(locale, "system.database"),
      ok: systemStatus.databaseHealthy,
      okText: td(locale, "system.healthy"),
      badText: td(locale, "system.unhealthy"),
      icon: Database,
    },
    {
      label: td(locale, "system.ai"),
      ok: systemStatus.supabaseConnected,
      okText: td(locale, "system.ready"),
      badText: td(locale, "system.disconnected"),
      icon: Bot,
    },
    {
      label: td(locale, "system.email"),
      ok: emailConfigured,
      okText: td(locale, "system.configured"),
      badText: td(locale, "system.not_configured"),
      icon: Mail,
    },
    {
      label: td(locale, "system.notifications"),
      ok: true,
      okText: td(locale, "system.ready"),
      badText: td(locale, "system.not_configured"),
      icon: Bell,
    },
    {
      label: td(locale, "system.backups"),
      ok: systemStatus.storageConnected && systemStatus.databaseHealthy,
      okText: td(locale, "system.healthy"),
      badText: td(locale, "system.unhealthy"),
      icon: Shield,
    },
    {
      label: td(locale, "system.website"),
      ok: systemStatus.websiteOnline,
      okText: td(locale, "system.online"),
      badText: td(locale, "system.offline"),
      icon: Server,
    },
  ];

  return (
    <DashboardSection title={td(locale, "system_status")}>
      <DashboardCard padding="md" className="divide-y divide-border/80">
        {rows.map(({ label, ok, okText, badText, icon: Icon }) => (
          <StatusRow
            key={label}
            label={label}
            ok={ok}
            okText={okText}
            badText={badText}
            icon={Icon}
          />
        ))}
      </DashboardCard>
    </DashboardSection>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  badText,
  icon: Icon,
}: {
  label: string;
  ok: boolean;
  okText: string;
  badText: string;
  icon: typeof Server;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-3 transition-colors hover:bg-background/80">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-primary">
          <Icon className="size-4" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            ok ? "bg-primary shadow-[0_0_0_3px_rgba(107,122,61,0.15)]" : "bg-gold",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            ok
              ? "bg-primary/10 text-primary"
              : "bg-gold/15 text-gold",
          )}
        >
          {ok ? okText : badText}
        </span>
      </div>
    </div>
  );
}
