"use client";

import { memo } from "react";
import Image from "next/image";
import {
  Briefcase,
  FolderTree,
  Images,
  Package,
  Pencil,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  DashboardCard,
  DashboardSection,
} from "@/components/admin/dashboard/dashboard-primitives";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { motion } from "@/lib/motion";
import { categoryName, productName, projectTitle } from "@/types/database";
import type { ActivityItem, DashboardData } from "@/types/dashboard";
import type { Locale } from "@/config/site";
import type { WebsiteSettings } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { PhoneText } from "@/components/ui/phone-link";
import { useDirection, useMounted } from "@/hooks";
import { formatInternationalPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardPanelsProps = {
  data: Pick<
    DashboardData,
    | "recentProducts"
    | "recentProjects"
    | "recentGallery"
    | "activity"
    | "systemStatus"
    | "settings"
  >;
};

export const DashboardPanels = memo(function DashboardPanels({
  data,
}: DashboardPanelsProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-2">
        <RecentActivity activity={data.activity} />
        <RecentProjects projects={data.recentProjects} />
      </div>

      <RecentProducts products={data.recentProducts} />

      <div className="grid gap-6 xl:grid-cols-3">
        <RecentGallery gallery={data.recentGallery} />
        <div className="space-y-6 xl:col-span-1">
          <SettingsSummary settings={data.settings} />
          <ShortcutsPanel />
        </div>
      </div>
    </div>
  );
});

function RecentProducts({
  products,
}: {
  products: DashboardData["recentProducts"];
}) {
  const { locale, isRtl } = useDirection();

  return (
    <DashboardSection
      title={td(locale, "recent_products")}
      action={
        <ButtonLink
          href="/admin/products"
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs text-primary hover:text-primary"
        >
          {td(locale, "view_all")}
        </ButtonLink>
      }
    >
      <DashboardCard padding="none" className="overflow-hidden">
        {products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-background/80">
                  <th className="px-4 py-3 text-start text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {td(locale, "table.image")}
                  </th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {td(locale, "table.name")}
                  </th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {td(locale, "table.category")}
                  </th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {td(locale, "table.status")}
                  </th>
                  <th className="px-4 py-3 text-end text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {td(locale, "table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-background/60"
                  >
                    <td className="px-4 py-3">
                      <div className="relative size-12 overflow-hidden rounded-xl border border-border bg-background">
                        {product.images?.[0] || product.image_url ? (
                          <Image
                            src={product.images?.[0] || product.image_url!}
                            alt={productName(product, locale)}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Package className="size-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[14rem] truncate font-medium text-foreground">
                        {productName(product, locale)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[10rem] truncate text-muted-foreground">
                        {product.category
                          ? categoryName(product.category, locale)
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        active={product.is_active}
                        featured={product.is_featured}
                      />
                    </td>
                    <td className="px-4 py-3 text-end">
                      <ButtonLink
                        href="/admin/products"
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-border hover:border-primary/40"
                      >
                        <Pencil className="size-3.5" />
                        <span className={cn(isRtl ? "me-1" : "ms-1", "hidden sm:inline")}>
                          {td(locale, "edit")}
                        </span>
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </DashboardCard>
    </DashboardSection>
  );
}

function RecentProjects({
  projects,
}: {
  projects: DashboardData["recentProjects"];
}) {
  const { locale } = useDirection();

  return (
    <DashboardSection
      title={td(locale, "recent_projects")}
      action={
        <ButtonLink
          href="/admin/projects"
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs text-primary"
        >
          {td(locale, "view_all")}
        </ButtonLink>
      }
    >
      <DashboardCard padding="sm">
        {projects.length ? (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-border hover:bg-background/70"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                  {project.cover_image ? (
                    <Image
                      src={project.cover_image}
                      alt={projectTitle(project, locale)}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Briefcase className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {projectTitle(project, locale)}
                  </p>
                  <Badge
                    variant={project.is_active ? "secondary" : "outline"}
                    className="mt-1 rounded-md"
                  >
                    {project.is_active
                      ? td(locale, "status_active")
                      : td(locale, "status_hidden")}
                  </Badge>
                </div>
                <ButtonLink href="/admin/projects" variant="ghost" size="sm">
                  <Pencil className="size-3.5" />
                </ButtonLink>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </DashboardCard>
    </DashboardSection>
  );
}

function RecentGallery({
  gallery,
}: {
  gallery: DashboardData["recentGallery"];
}) {
  const { locale } = useDirection();

  return (
    <DashboardSection
      title={td(locale, "recent_gallery")}
      action={
        <ButtonLink
          href="/admin/gallery"
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs text-primary"
        >
          {td(locale, "view_all")}
        </ButtonLink>
      }
      className="xl:col-span-2"
    >
      <DashboardCard padding="md">
        {gallery.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="group relative aspect-square overflow-hidden rounded-[16px] border border-border bg-background"
              >
                <Image
                  src={image.image_url}
                  alt={image.title ?? "Gallery"}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </DashboardCard>
    </DashboardSection>
  );
}

function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  const { locale } = useDirection();
  const mounted = useMounted();

  const activityIcons = {
    product_created: Package,
    product_updated: Package,
    category_updated: FolderTree,
    gallery_uploaded: Images,
    settings_changed: Settings,
  };

  return (
    <DashboardSection title={td(locale, "recent_activity")}>
      <DashboardCard padding="md">
        {activity.length ? (
          <div className="space-y-0">
            {activity.map((entry, index) => {
              const Icon = activityIcons[entry.type];
              return (
                <div key={entry.id} className="flex gap-3 py-3">
                  <div className="relative flex flex-col items-center">
                    <div className="flex size-8 items-center justify-center rounded-xl border border-border bg-background text-primary">
                      <Icon className="size-3.5" />
                    </div>
                    {index < activity.length - 1 ? (
                      <div className="mt-2 w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 border-b border-border/70 pb-3 last:border-0">
                    <p className="text-sm font-medium text-foreground">
                      {td(locale, `activity.${entry.type}`)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.entityName}
                    </p>
                    <p
                      className="mt-1 min-h-4 text-[11px] text-muted-foreground tabular-nums"
                      suppressHydrationWarning
                    >
                      {mounted
                        ? formatActivityTime(entry.timestamp, locale)
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </DashboardCard>
    </DashboardSection>
  );
}

function SettingsSummary({ settings }: { settings: WebsiteSettings | null }) {
  const { locale } = useDirection();

  return (
    <DashboardSection
      title={td(locale, "settings_summary")}
      action={
        <ButtonLink
          href="/admin/settings"
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs text-primary"
        >
          {td(locale, "edit")}
        </ButtonLink>
      }
    >
      <DashboardCard padding="md">
        <div className="flex items-center gap-3">
          <div className="relative size-12 overflow-hidden rounded-xl border border-border bg-background">
            {settings?.company_logo ? (
              <Image
                src={settings.company_logo}
                alt={settings.company_name}
                fill
                className="object-contain p-1"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Sparkles className="size-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {settings?.company_name ?? td(locale, "settings_fields.not_set")}
            </p>
            <p className="text-xs text-muted-foreground">
              {td(locale, "website_settings")}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <SummaryRow
            label={td(locale, "settings_fields.phone")}
            value={settings?.phone_number}
            isPhone
          />
          <SummaryRow
            label={td(locale, "settings_fields.email")}
            value={settings?.email_addresses?.[0]?.email}
          />
          <SummaryRow
            label={td(locale, "settings_fields.address")}
            value={settings?.company_address}
          />
        </div>
        <ButtonLink
          href="/admin/settings"
          className="mt-4 w-full rounded-xl bg-primary text-white hover:bg-primary-hover"
        >
          {td(locale, "website_settings")}
        </ButtonLink>
      </DashboardCard>
    </DashboardSection>
  );
}

function ShortcutsPanel() {
  const { locale } = useDirection();

  return (
    <DashboardSection title={td(locale, "shortcuts")}>
      <DashboardCard padding="md" className="space-y-2.5 text-sm">
        <ShortcutRow label={td(locale, "shortcut_product")} keys="Ctrl + P" />
        <ShortcutRow label={td(locale, "shortcut_category")} keys="Ctrl + C" />
        <ShortcutRow label={td(locale, "shortcut_gallery")} keys="Ctrl + G" />
        <ShortcutRow label={td(locale, "shortcut_settings")} keys="Ctrl + S" />
      </DashboardCard>
    </DashboardSection>
  );
}

function StatusBadge({
  active,
  featured,
}: {
  active: boolean;
  featured: boolean;
}) {
  const { locale } = useDirection();
  if (featured) {
    return (
      <Badge className="rounded-md bg-gold/15 text-gold hover:bg-gold/20">
        {td(locale, "status_featured")}
      </Badge>
    );
  }
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className="rounded-md"
    >
      {active ? td(locale, "status_active") : td(locale, "status_hidden")}
    </Badge>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <kbd className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-primary">
        {keys}
      </kbd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  isPhone = false,
}: {
  label: string;
  value?: string | null;
  isPhone?: boolean;
}) {
  const { locale } = useDirection();
  const display = isPhone
    ? formatInternationalPhone(value) || null
    : value;

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {isPhone && value ? (
        <PhoneText
          phone={value}
          className="truncate text-end font-medium text-foreground"
        />
      ) : (
        <span className="truncate text-end font-medium text-foreground">
          {display || td(locale, "settings_fields.not_set")}
        </span>
      )}
    </div>
  );
}

function EmptyState() {
  const { locale } = useDirection();
  return (
    <p className="px-4 py-12 text-center text-sm text-muted-foreground">
      {td(locale, "no_results")}
    </p>
  );
}

function formatActivityTime(timestamp: string, locale: Locale): string {
  const tag = locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : "en-US";
  try {
    return new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}
