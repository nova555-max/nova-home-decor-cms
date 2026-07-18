export const GEMINI_MODEL = "gemini-3.5-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-3-flash-preview";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || GEMINI_MODEL;
}

export function getGeminiFallbackModel(): string {
  return process.env.GEMINI_FALLBACK_MODEL?.trim() || GEMINI_FALLBACK_MODEL;
}

export function getGeminiModels(): string[] {
  const primary = getGeminiModel();
  const fallback = getGeminiFallbackModel();
  return primary === fallback ? [primary] : [primary, fallback];
}

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function assertGeminiConfigured(): string {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add Secret GEMINI_API_KEY in Cloudflare Variables and Secrets (or .env.local locally).",
    );
  }
  return key;
}

export function isGeminiModelNotFound(status: number, detail?: string): boolean {
  if (status !== 404) return false;
  if (!detail) return true;
  const lower = detail.toLowerCase();
  return lower.includes("not found") || lower.includes("is not supported");
}

export function isGeminiQuotaError(status: number, detail?: string): boolean {
  if (status === 429) return true;
  if (!detail) return false;
  const lower = detail.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted")
  );
}

export class GeminiApiError extends Error {
  status: number;
  quotaExceeded: boolean;
  modelNotFound: boolean;

  constructor(status: number, detail: string) {
    super(
      `Gemini request failed (${status})${detail ? `: ${detail.slice(0, 240)}` : ""}`,
    );
    this.name = "GeminiApiError";
    this.status = status;
    this.quotaExceeded = isGeminiQuotaError(status, detail);
    this.modelNotFound = isGeminiModelNotFound(status, detail);
  }
}

export function toGeminiApiError(error: unknown): GeminiApiError {
  if (error instanceof GeminiApiError) return error;

  const apiError = error as { status?: number; message?: string };
  if (typeof apiError.status === "number") {
    return new GeminiApiError(apiError.status, apiError.message ?? "");
  }

  if (error instanceof Error) {
    return new GeminiApiError(500, error.message);
  }

  return new GeminiApiError(500, "Unknown Gemini error");
}
