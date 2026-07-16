import type { QaScanReport, QaTestResult } from "@/types/qa";

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportQaLogs(report: QaScanReport) {
  downloadBlob(
    `nova-qa-logs-${report.id}.json`,
    JSON.stringify(report, null, 2),
    "application/json",
  );
}

export function exportQaExcel(report: QaScanReport) {
  const headers = [
    "ID",
    "Category",
    "Test",
    "Status",
    "Severity",
    "Message",
    "Affected Page",
    "Suggested Fix",
    "Response Time (ms)",
  ];

  const rows = report.tests.map((test) =>
    [
      test.id,
      test.category,
      test.name,
      test.status,
      test.severity,
      test.message,
      test.affectedPage ?? "",
      test.suggestedFix ?? "",
      String(test.responseTimeMs),
    ]
      .map(escapeCsv)
      .join(","),
  );

  const meta = [
    `# Nova Home Decor QA Report`,
    `# Scan: ${report.scanType}`,
    `# Score: ${report.productionReadinessScore}%`,
    `# Completed: ${report.completedAt}`,
    "",
    headers.join(","),
    ...rows,
  ].join("\n");

  downloadBlob(
    `nova-qa-report-${report.id}.csv`,
    meta,
    "text/csv;charset=utf-8",
  );
}

function statusColor(status: QaTestResult["status"]) {
  if (status === "pass") return "#16a34a";
  if (status === "fail") return "#dc2626";
  return "#ca8a04";
}

export function exportQaPdf(report: QaScanReport) {
  const failed = report.tests.filter((t) => t.status === "fail");
  const warnings = report.tests.filter((t) => t.status === "warning");

  const rows = report.tests
    .map(
      (test) => `
      <tr>
        <td>${test.category}</td>
        <td>${test.name}</td>
        <td style="color:${statusColor(test.status)};font-weight:600;text-transform:uppercase">${test.status}</td>
        <td>${test.severity}</td>
        <td>${test.message}</td>
        <td>${test.affectedPage ?? "—"}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Nova QA Report ${report.id}</title>
  <style>
    body { font-family: Inter, Segoe UI, sans-serif; color: #2f2f2f; margin: 32px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; font-size: 13px; }
    .score { font-size: 32px; font-weight: 700; color: #6b7a3d; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e8e5dc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f8f7f2; }
    .section { margin-top: 24px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>Nova Home Decor — QA Center Report</h1>
  <p class="meta">Scan type: ${report.scanType} · Completed: ${new Date(report.completedAt).toLocaleString()}</p>
  <div class="score">Production Readiness: ${report.productionReadinessScore}%</div>
  <p>Total ${report.summary.total} · Passed ${report.summary.passed} · Failed ${report.summary.failed} · Warnings ${report.summary.warnings} · Critical errors ${report.summary.criticalErrors}</p>

  <div class="section">
    <h2>All Tests</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Test</th><th>Status</th><th>Severity</th><th>Details</th><th>Page</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  ${
    failed.length > 0
      ? `<div class="section"><h2>Failed Items & Fixes</h2><ul>${failed
          .map(
            (t) =>
              `<li><strong>${t.name}</strong> (${t.severity}) — ${t.message}. Fix: ${t.suggestedFix ?? "Review module"} · Page: ${t.affectedPage ?? "—"}</li>`,
          )
          .join("")}</ul></div>`
      : ""
  }

  ${
    warnings.length > 0
      ? `<div class="section"><h2>Warnings</h2><ul>${warnings
          .map((t) => `<li><strong>${t.name}</strong> — ${t.message}</li>`)
          .join("")}</ul></div>`
      : ""
  }
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
