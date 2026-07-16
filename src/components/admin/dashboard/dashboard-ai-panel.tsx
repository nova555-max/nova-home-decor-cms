"use client";

import type { ReactNode } from "react";
import {
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  DashboardCard,
  DashboardMotionSection,
} from "@/components/admin/dashboard/dashboard-primitives";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { useAdminT } from "@/hooks";
import { useDirection } from "@/hooks";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

const promptKeys = [
  "ai_panel.prompt_seo",
  "ai_panel.prompt_product",
  "ai_panel.prompt_social",
] as const;

const taskKeys = [
  "ai_panel.task_review",
  "ai_panel.task_gallery",
  "ai_panel.task_seo",
] as const;

const insightKeys = [
  "ai_panel.insight_products",
  "ai_panel.insight_content",
] as const;

export function DashboardAiPanel() {
  const t = useAdminT();
  const { locale } = useDirection();

  return (
    <DashboardMotionSection>
      <div id="dashboard-ai" className="scroll-mt-24">
        <DashboardCard
          padding="lg"
          className="relative overflow-hidden border-border bg-gradient-to-br from-white via-white to-gold/[0.08]"
        >
          <div
            className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />

          <div className="relative space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-gold shadow-sm">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {t("ai.dashboard_title")}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {t("ai.dashboard_desc")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink
                  href="/admin/seo"
                  variant="outline"
                  className="rounded-xl border-border bg-card/90 hover:border-primary/40"
                >
                  <Wand2 className="size-4" />
                  {t("ai.seo_tools")}
                </ButtonLink>
                <ButtonLink
                  href="/admin/products"
                  variant="outline"
                  className="rounded-xl border-border bg-card/90 hover:border-primary/40"
                >
                  <Sparkles className="size-4" />
                  {t("ai.generate")}
                </ButtonLink>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AiBlock
                title={td(locale, "ai_panel.quick_prompts")}
                icon={MessageSquareText}
              >
                <div className="flex flex-wrap gap-2">
                  {promptKeys.map((key) => (
                    <span
                      key={key}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      {td(locale, key)}
                    </span>
                  ))}
                </div>
              </AiBlock>

              <AiBlock
                title={td(locale, "ai_panel.suggested_tasks")}
                icon={ListChecks}
              >
                <ul className="space-y-2 text-sm text-foreground">
                  {taskKeys.map((key) => (
                    <li
                      key={key}
                      className="flex items-start gap-2 rounded-xl border border-border/70 bg-card/70 px-3 py-2"
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-gold" />
                      {td(locale, key)}
                    </li>
                  ))}
                </ul>
              </AiBlock>

              <AiBlock
                title={td(locale, "ai_panel.insights")}
                icon={Lightbulb}
              >
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {insightKeys.map((key) => (
                    <li
                      key={key}
                      className="rounded-xl border border-dashed border-gold/40 bg-gold/[0.06] px-3 py-2"
                    >
                      {td(locale, key)}
                    </li>
                  ))}
                </ul>
              </AiBlock>
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquareText className="size-4 shrink-0 text-gold" />
              {t("ai.dashboard_hint")}
            </p>
          </div>
        </DashboardCard>
      </div>
    </DashboardMotionSection>
  );
}

function AiBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-border bg-card/80 p-4 shadow-sm",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
