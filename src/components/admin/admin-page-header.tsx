"use client";

import { useAdminT } from "@/hooks";

type AdminPageHeaderProps = {
  titleKey: string;
  subtitleKey: string;
  action?: React.ReactNode;
};

export function AdminPageHeader({
  titleKey,
  subtitleKey,
  action,
}: AdminPageHeaderProps) {
  const t = useAdminT();

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1
          className="text-2xl font-semibold tracking-tight md:text-3xl"
          suppressHydrationWarning
        >
          {t(titleKey)}
        </h1>
        <p
          className="text-muted-foreground text-sm leading-relaxed"
          suppressHydrationWarning
        >
          {t(subtitleKey)}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
