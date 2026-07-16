import type {
  QaReadinessStatus,
  QaScanSummary,
  QaTestResult,
} from "@/types/qa";

const SEVERITY_WEIGHT: Record<QaTestResult["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function weightedScore(tests: QaTestResult[]): number {
  if (tests.length === 0) return 0;

  let total = 0;
  let earned = 0;

  for (const test of tests) {
    const weight = SEVERITY_WEIGHT[test.severity];
    total += weight;
    if (test.status === "pass") earned += weight;
    else if (test.status === "warning") earned += weight * 0.7;
  }

  return Math.round((earned / total) * 100);
}

export function summarizeTests(tests: QaTestResult[]): QaScanSummary {
  const passed = tests.filter((t) => t.status === "pass").length;
  const failed = tests.filter((t) => t.status === "fail").length;
  const warnings = tests.filter((t) => t.status === "warning").length;
  const criticalErrors = tests.filter(
    (t) => t.status === "fail" && t.severity === "critical",
  ).length;

  return {
    total: tests.length,
    passed,
    failed,
    warnings,
    criticalErrors,
  };
}

export function calculateProductionReadiness(tests: QaTestResult[]): {
  productionReadinessScore: number;
  readinessStatus: QaReadinessStatus;
} {
  const criticalFails = tests.filter(
    (t) => t.status === "fail" && t.severity === "critical",
  );
  const anyFails = tests.filter((t) => t.status === "fail");
  const criticalWarnings = tests.filter(
    (t) => t.status === "warning" && t.severity === "critical",
  );
  const score = weightedScore(tests);
  const allPass = tests.every((t) => t.status === "pass");

  if (criticalFails.length > 0) {
    return {
      productionReadinessScore: Math.min(score, 69),
      readinessStatus: "not_ready",
    };
  }

  if (allPass) {
    return {
      productionReadinessScore: 100,
      readinessStatus: "ready",
    };
  }

  if (anyFails.length > 0) {
    return {
      productionReadinessScore: Math.min(score, 91),
      readinessStatus: "partial",
    };
  }

  if (criticalWarnings.length > 0) {
    return {
      productionReadinessScore: Math.min(score, 92),
      readinessStatus: "partial",
    };
  }

  return {
    productionReadinessScore: Math.min(score, 99),
    readinessStatus: "partial",
  };
}

export function averageResponseTime(tests: QaTestResult[]): number {
  if (tests.length === 0) return 0;
  const total = tests.reduce((sum, test) => sum + test.responseTimeMs, 0);
  return Math.round(total / tests.length);
}
