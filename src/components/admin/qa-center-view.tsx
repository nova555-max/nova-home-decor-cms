"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  DashboardCard,
  DashboardSection,
} from "@/components/admin/dashboard/dashboard-primitives";
import { executeQaScan } from "@/lib/actions/qa";
import {
  exportQaExcel,
  exportQaLogs,
  exportQaPdf,
} from "@/lib/qa/export";
import { useAdminT } from "@/hooks";
import { cn } from "@/lib/utils";
import { QA_CATEGORIES, type QaCategory, type QaScanReport } from "@/types/qa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nova-qa-last-report";

type QaCenterViewProps = {
  initialReport: QaScanReport | null;
};

function statusIcon(status: QaScanReport["readinessStatus"]) {
  if (status === "ready") return ShieldCheck;
  if (status === "partial") return AlertTriangle;
  return ShieldAlert;
}

function statusTone(status: QaScanReport["readinessStatus"]) {
  if (status === "ready") {
    return {
      ring: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-primary/5",
      text: "text-emerald-600",
      emoji: "🟢",
    };
  }
  if (status === "partial") {
    return {
      ring: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-gold/10",
      text: "text-amber-600",
      emoji: "🟡",
    };
  }
  return {
    ring: "border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent",
    text: "text-red-600",
    emoji: "🔴",
  };
}

function TestStatusBadge({ status }: { status: "pass" | "fail" | "warning" }) {
  if (status === "pass") {
    return (
      <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
        <CheckCircle2 className="me-1 size-3" />
        PASS
      </Badge>
    );
  }
  if (status === "fail") {
    return (
      <Badge className="rounded-full bg-red-500/10 text-red-700 hover:bg-red-500/10">
        <XCircle className="me-1 size-3" />
        FAIL
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">
      <AlertTriangle className="me-1 size-3" />
      WARNING
    </Badge>
  );
}

export function QaCenterView({ initialReport }: QaCenterViewProps) {
  const t = useAdminT();
  const [report, setReport] = useState<QaScanReport | null>(initialReport);
  const [activeCategory, setActiveCategory] = useState<QaCategory | "all">(
    "all",
  );
  const [isPending, startTransition] = useTransition();

  const filteredTests = useMemo(() => {
    if (!report) return [];
    if (activeCategory === "all") return report.tests;
    return report.tests.filter((test) => test.category === activeCategory);
  }, [report, activeCategory]);

  const failedTests = useMemo(
    () => report?.tests.filter((test) => test.status === "fail") ?? [],
    [report],
  );

  const runScan = (scanType: "full" | "quick") => {
    startTransition(async () => {
      const result = await executeQaScan(scanType);
      if (result.success) {
        setReport(result.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
        toast.success(t("qa.scan_complete"));
      } else {
        toast.error(result.error);
      }
    });
  };

  const readiness = report ? statusTone(report.readinessStatus) : null;
  const ReadinessIcon = report ? statusIcon(report.readinessStatus) : ShieldCheck;

  return (
    <div className="space-y-8 pb-10">
      <AdminPageHeader
        titleKey="pages.qa.title"
        subtitleKey="pages.qa.subtitle"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runScan("quick")}
              disabled={isPending}
              variant="outline"
              className="rounded-xl"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {t("qa.run_quick")}
            </Button>
            <Button
              onClick={() => runScan("full")}
              disabled={isPending}
              className="rounded-xl"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {t("qa.run_full")}
            </Button>
          </div>
        }
      />

      <DashboardCard
        padding="lg"
        className={cn(
          "relative overflow-hidden border-2",
          readiness?.ring ?? "border-border bg-card/50",
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ClipboardCheck className="size-5" />
              <span className="text-sm font-semibold tracking-wide uppercase">
                {t("qa.readiness_title")}
              </span>
            </div>
            {report ? (
              <>
                <p className={cn("text-3xl font-semibold tracking-tight", readiness?.text)}>
                  {readiness?.emoji}{" "}
                  {report.readinessStatus === "ready"
                    ? t("qa.ready_production")
                    : report.readinessStatus === "not_ready"
                      ? t("qa.not_ready")
                      : t("qa.readiness_partial").replace(
                          "{score}",
                          String(report.productionReadinessScore),
                        )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {report.productionReadinessScore === 100
                    ? t("qa.score_perfect")
                    : t("qa.score_note")}
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">{t("qa.no_scan_yet")}</p>
            )}
          </div>

          <div className="flex size-20 items-center justify-center rounded-[22px] border border-border bg-background shadow-sm">
            <ReadinessIcon
              className={cn("size-10", readiness?.text ?? "text-primary")}
            />
          </div>
        </div>

        {report ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatPill label={t("qa.total_tests")} value={report.summary.total} />
            <StatPill
              label={t("qa.passed")}
              value={report.summary.passed}
              tone="pass"
            />
            <StatPill
              label={t("qa.failed")}
              value={report.summary.failed}
              tone="fail"
            />
            <StatPill
              label={t("qa.warnings")}
              value={report.summary.warnings}
              tone="warn"
            />
            <StatPill
              label={t("qa.critical_errors")}
              value={report.summary.criticalErrors}
              tone="fail"
            />
            <StatPill
              label={t("qa.last_scan")}
              value={new Date(report.completedAt).toLocaleString()}
              small
            />
            <StatPill
              label={t("qa.avg_response")}
              value={`${report.averageResponseTimeMs}ms`}
            />
            <StatPill
              label={t("qa.scan_type")}
              value={report.scanType === "full" ? t("qa.full") : t("qa.quick")}
            />
          </div>
        ) : null}
      </DashboardCard>

      {report ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => exportQaPdf(report)}
          >
            <FileText className="size-4" />
            {t("qa.export_pdf")}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => exportQaExcel(report)}
          >
            <FileSpreadsheet className="size-4" />
            {t("qa.export_excel")}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => exportQaLogs(report)}
          >
            <Download className="size-4" />
            {t("qa.export_logs")}
          </Button>
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => runScan(report.scanType)}
            disabled={isPending}
          >
            <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
            {t("qa.rescan")}
          </Button>
        </div>
      ) : null}

      {failedTests.length > 0 ? (
        <DashboardSection title={t("qa.critical_issues")}>
          <div className="grid gap-3">
            {failedTests.map((test) => (
              <DashboardCard key={test.id} padding="md" className="border-red-500/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{test.name}</h3>
                      <TestStatusBadge status={test.status} />
                      <Badge variant="outline" className="rounded-full uppercase">
                        {test.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {t("qa.affected_page")}:
                      </span>{" "}
                      {test.affectedPage ?? "—"}
                    </p>
                    <p className="text-xs text-primary">
                      <span className="font-medium">{t("qa.suggested_fix")}:</span>{" "}
                      {test.suggestedFix ?? t("qa.review_module")}
                    </p>
                  </div>
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                </div>
              </DashboardCard>
            ))}
          </div>
        </DashboardSection>
      ) : null}

      <DashboardSection title={t("qa.results_title")}>
        <div className="mb-4 flex flex-wrap gap-2">
          <CategoryChip
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            label={t("qa.all_categories")}
          />
          {QA_CATEGORIES.map((category) => (
            <CategoryChip
              key={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              label={t(`qa.categories.${category}`)}
            />
          ))}
        </div>

        {!report ? (
          <DashboardCard padding="lg" className="text-center">
            <p className="text-muted-foreground">{t("qa.empty_state")}</p>
          </DashboardCard>
        ) : (
          <div className="space-y-3">
            {filteredTests.map((test) => (
              <DashboardCard key={test.id} padding="md" hover>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(`qa.categories.${test.category}`)}
                      </span>
                      <TestStatusBadge status={test.status} />
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                        {test.severity}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground">{test.name}</h3>
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                    {test.status !== "pass" ? (
                      <div className="space-y-1 text-xs">
                        <p>
                          <span className="font-medium">{t("qa.affected_page")}:</span>{" "}
                          {test.affectedPage ?? "—"}
                        </p>
                        <p className="text-primary">
                          <span className="font-medium">{t("qa.suggested_fix")}:</span>{" "}
                          {test.suggestedFix ?? t("qa.review_module")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {test.responseTimeMs}ms
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        )}
      </DashboardSection>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string | number;
  tone?: "pass" | "fail" | "warn";
  small?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-background/80 px-4 py-3">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-semibold text-foreground tabular-nums",
          small ? "text-sm" : "text-xl",
          tone === "pass" && "text-emerald-600",
          tone === "fail" && "text-red-600",
          tone === "warn" && "text-amber-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
