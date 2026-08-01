import { randomUUID } from "node:crypto";

import type { ActionResult } from "@/lib/actions/action-types";
import { HERO_SLIDES_BUCKET } from "@/lib/constants";
import {
  isLocalDevStorage,
  saveLocalUpload,
} from "@/lib/dev/local-uploads";
import {
  needsServiceRoleForWrites,
  UPLOAD_SERVICE_ROLE_REQUIRED_MSG,
} from "@/lib/dev/local-mode";
import { assertPersistableMediaUrl } from "@/lib/media/storage-url";
import { logUploadStep } from "@/lib/settings/persist-settings";
import { getServiceRoleKey } from "@/lib/supabase/admin";
import { createStorageWriteClient } from "@/lib/supabase/storage-client";
import {
  HERO_SLIDE_ACCEPT,
  HERO_SLIDE_MAX_BYTES,
} from "@/types/hero-slides";

const ALLOWED_MIME = new Set<string>([
  ...HERO_SLIDE_ACCEPT,
  "image/jpg", // non-standard but used by some mobile browsers
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function normalizeMime(type: string | undefined | null): string {
  return (type ?? "").trim().toLowerCase();
}

export function resolveHeroSlideMime(file: File): string | null {
  const mime = normalizeMime(file.type);
  if (ALLOWED_MIME.has(mime)) {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }

  // Safari / iOS often sends an empty MIME type — fall back to extension.
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export function validateHeroSlideFile(file: File): string | null {
  if (!file || file.size <= 0) {
    return "No image file provided.";
  }
  if (file.size > HERO_SLIDE_MAX_BYTES) {
    return `File is too large (max ${Math.round(HERO_SLIDE_MAX_BYTES / (1024 * 1024))}MB).`;
  }
  if (!resolveHeroSlideMime(file)) {
    return "Only JPG, JPEG, PNG, or WebP images are allowed.";
  }
  return null;
}

async function ensureHeroSlidesBucket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string | null> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      logUploadStep("hero-list-buckets-error", { message: error.message });
      return error.message;
    }

    const exists = (buckets ?? []).some(
      (bucket: { name: string }) => bucket.name === HERO_SLIDES_BUCKET,
    );
    if (exists) return null;

    if (!getServiceRoleKey()) {
      return (
        `Storage bucket "${HERO_SLIDES_BUCKET}" does not exist. ` +
        "Create a public bucket named hero_slides in Supabase Storage, " +
        "or set SUPABASE_SERVICE_ROLE_KEY so the app can create it."
      );
    }

    const { error: createError } = await supabase.storage.createBucket(
      HERO_SLIDES_BUCKET,
      {
        public: true,
        fileSizeLimit: HERO_SLIDE_MAX_BYTES,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
    );

    if (createError) {
      if (createError.message.toLowerCase().includes("already exists")) {
        return null;
      }
      return `Could not create bucket "${HERO_SLIDES_BUCKET}": ${createError.message}`;
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function heroSlidePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${HERO_SLIDES_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length).split("?")[0]);
}

export async function deleteHeroSlideStorageObject(
  publicUrl: string,
): Promise<void> {
  const path = heroSlidePathFromPublicUrl(publicUrl);
  if (!path || isLocalDevStorage()) return;

  try {
    const supabase = await createStorageWriteClient();
    const { error } = await supabase.storage
      .from(HERO_SLIDES_BUCKET)
      .remove([path]);
    if (error) {
      console.error("[hero-upload:cleanup]", error.message, { path });
    }
  } catch (error) {
    console.error("[hero-upload:cleanup]", error);
  }
}

export async function uploadHeroSlideToStorage(
  file: File,
): Promise<ActionResult<{ publicUrl: string; path: string }>> {
  if (needsServiceRoleForWrites() && !isLocalDevStorage()) {
    return { success: false, error: UPLOAD_SERVICE_ROLE_REQUIRED_MSG };
  }

  const validationError = validateHeroSlideFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const mime = resolveHeroSlideMime(file)!;
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const path = `${randomUUID()}.${ext}`;

  if (isLocalDevStorage()) {
    try {
      const renamed = new File([file], path, { type: mime });
      const { url, storagePath } = await saveLocalUpload(
        renamed,
        HERO_SLIDES_BUCKET,
      );
      return { success: true, data: { publicUrl: url, path: storagePath } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Local upload failed",
      };
    }
  }

  const supabase = await createStorageWriteClient();
  const bucketError = await ensureHeroSlidesBucket(supabase);
  if (bucketError) {
    return { success: false, error: bucketError };
  }

  logUploadStep("hero-supabase-upload-start", {
    bucket: HERO_SLIDES_BUCKET,
    path,
    size: file.size,
    type: mime,
  });

  const { error } = await supabase.storage
    .from(HERO_SLIDES_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: mime,
      cacheControl: "3600",
    });

  if (error) {
    logUploadStep("hero-supabase-upload-error", {
      message: error.message,
      path,
    });
    console.error("[hero-upload]", error.message, { path });
    return { success: false, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(HERO_SLIDES_BUCKET).getPublicUrl(path);

  const urlError = assertPersistableMediaUrl(publicUrl, "Hero image", [
    HERO_SLIDES_BUCKET,
  ]);
  if (urlError) {
    await supabase.storage.from(HERO_SLIDES_BUCKET).remove([path]);
    return { success: false, error: urlError };
  }

  logUploadStep("hero-supabase-upload-success", { path, publicUrl });
  return { success: true, data: { publicUrl, path } };
}
