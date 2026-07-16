export const QA_CATEGORIES = [
  "authentication",
  "crud",
  "upload",
  "save",
  "database",
  "storage",
  "ai",
  "public_website",
  "dashboard",
  "seo",
  "performance",
  "security",
  "mobile",
  "accessibility",
  "error_handling",
] as const;

export type QaCategory = (typeof QA_CATEGORIES)[number];

export type QaTestStatus = "pass" | "fail" | "warning";

export type QaSeverity = "critical" | "high" | "medium" | "low";

export type QaScanType = "full" | "quick";

export type QaTestResult = {
  id: string;
  category: QaCategory;
  name: string;
  status: QaTestStatus;
  severity: QaSeverity;
  message: string;
  affectedPage?: string;
  suggestedFix?: string;
  responseTimeMs: number;
};

export type QaScanSummary = {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalErrors: number;
};

export type QaReadinessStatus = "ready" | "partial" | "not_ready";

export type QaScanReport = {
  id: string;
  scanType: QaScanType;
  startedAt: string;
  completedAt: string;
  averageResponseTimeMs: number;
  tests: QaTestResult[];
  summary: QaScanSummary;
  productionReadinessScore: number;
  readinessStatus: QaReadinessStatus;
};
