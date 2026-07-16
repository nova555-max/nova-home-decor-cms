import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal();
  process.env.QA_STANDALONE = "1";

  const { runQaScan } = await import("../src/lib/qa/scanner");
  const report = await runQaScan("full");
  const failures = report.tests.filter((t) => t.status !== "pass");
  const targetIds = [
    "crud-website_content_strings",
    "save-content-versions",
    "save-draft-publish",
    "ai-cms-search-scope",
  ];
  const targetResults = report.tests.filter((t) => targetIds.includes(t.id));

  console.log("Production Readiness:", report.productionReadinessScore + "%");
  console.log("Status:", report.readinessStatus);
  console.log("Summary:", report.summary);

  console.log("\nTarget QA checks:");
  for (const test of targetResults) {
    console.log(`- [${test.status}] ${test.name}: ${test.message}`);
  }

  if (failures.length) {
    console.log("\nNon-passing tests:");
    for (const test of failures) {
      console.log(`- [${test.status}] ${test.name}: ${test.message}`);
    }
    process.exit(1);
  }

  console.log("\nAll tests passed.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
