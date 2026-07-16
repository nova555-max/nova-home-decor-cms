import { uploadBrandingImage, uploadImage } from "@/lib/actions/cms";
import { uploadMediaAsset } from "@/lib/actions/media";
import { logActionError } from "@/lib/actions/action-helpers";
import { refreshAuthSession } from "@/lib/auth/refresh-session";
import type { MediaAsset } from "@/types/database";
import type { WebsiteSettings } from "@/types/database";
import type { BrandingField } from "@/lib/actions/cms";
import {
  isAuthError,
  isRetryableUploadError,
} from "@/lib/upload/upload-errors";

const RETRY_DELAY_MS = 600;

export type UploadProgress = {
  attempt: number;
  maxAttempts: number;
};

type RetryOptions = {
  maxAttempts?: number;
  onProgress?: (progress: UploadProgress) => void;
};

async function delay(attempt: number) {
  await new Promise((resolve) =>
    setTimeout(resolve, RETRY_DELAY_MS * attempt),
  );
}

async function runWithRetry<T>(
  scope: string,
  run: () => Promise<
    { success: true; data: T } | { success: false; error: string }
  >,
  options?: RetryOptions,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const maxAttempts = options?.maxAttempts ?? 3;
  let lastError = "Upload failed";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options?.onProgress?.({ attempt, maxAttempts });

    const result = await run();
    if (result.success) {
      return result;
    }

    lastError = result.error;

    if (!isRetryableUploadError(lastError)) {
      logActionError(scope, lastError, { attempt });
      return { success: false, error: lastError };
    }

    if (isAuthError(lastError) && attempt < maxAttempts) {
      await refreshAuthSession();
    }

    if (attempt < maxAttempts) {
      await delay(attempt);
    }
  }

  logActionError(scope, lastError, { maxAttempts });
  return { success: false, error: lastError };
}

export async function uploadImageWithRetry(
  formData: FormData,
  options?: RetryOptions,
): Promise<
  { success: true; data: string } | { success: false; error: string }
> {
  const result = await runWithRetry("upload-image", async () => {
    const response = await uploadImage(formData);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    return {
      success: false,
      error: response.success ? "Upload failed" : response.error,
    };
  }, options);

  return result;
}

export async function uploadMediaWithRetry(
  formData: FormData,
  options?: RetryOptions,
): Promise<
  | { success: true; data: MediaAsset }
  | { success: false; error: string }
> {
  return runWithRetry("upload-media", async () => {
    const response = await uploadMediaAsset(formData);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    return {
      success: false,
      error: response.success ? "Upload failed" : response.error,
    };
  }, options);
}

export async function uploadBrandingWithRetry(
  file: File,
  field: BrandingField,
  options?: RetryOptions,
): Promise<
  | { success: true; data: { url: string; settings: WebsiteSettings } }
  | { success: false; error: string }
> {
  return runWithRetry("upload-branding", async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);
    const response = await uploadBrandingImage(formData);
    if (response.success && response.data) {
      return { success: true, data: response.data };
    }
    return {
      success: false,
      error: response.success ? "Upload failed" : response.error,
    };
  }, options);
}
