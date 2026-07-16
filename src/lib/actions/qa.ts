"use server";

import { runQaScan } from "@/lib/qa/scanner";
import { requireAdmin } from "@/lib/supabase/auth";
import type { QaScanReport, QaScanType } from "@/types/qa";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function executeQaScan(
  scanType: QaScanType,
): Promise<ActionResult<QaScanReport>> {
  try {
    const ctx = await requireAdmin();
    if (ctx.role !== "super_admin") {
      return {
        success: false,
        error: "Only super administrators can run QA scans.",
      };
    }

    const report = await runQaScan(scanType);
    return { success: true, data: report };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "QA scan failed unexpectedly";
    return { success: false, error: message };
  }
}
