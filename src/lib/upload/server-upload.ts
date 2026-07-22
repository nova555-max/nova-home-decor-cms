import { CACHE_TAGS, STORAGE_BUCKET } from "@/lib/constants";
import { revalidateTag } from "next/cache";

import { actionErrorMessage } from "@/lib/actions/action-utils";
import {
  isLocalDevStorage,
  registerLocalMediaAsset,
  saveLocalUpload,
} from "@/lib/dev/local-uploads";
import {
  needsServiceRoleForWrites,
  RLS_DEV_HINT,
  UPLOAD_SERVICE_ROLE_REQUIRED_MSG,
} from "@/lib/dev/local-mode";
import { assertPersistableMediaUrl } from "@/lib/media/storage-url";
import { logUploadStep } from "@/lib/settings/persist-settings";
import { createStorageWriteClient } from "@/lib/supabase/storage-client";
import { getServiceRoleKey } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/action-types";

export function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;

  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/bmp": "bmp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };

  return byType[file.type] ?? "jpg";
}

async function ensureCmsUploadsBucket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string | null> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      logUploadStep("list-buckets-error", { message: error.message });
      // Cannot list — continue; upload will surface a clearer error.
      return null;
    }

    const exists = (buckets ?? []).some(
      (bucket: { name: string }) => bucket.name === STORAGE_BUCKET,
    );
    if (exists) {
      logUploadStep("bucket-exists", { bucket: STORAGE_BUCKET });
      return null;
    }

    if (!getServiceRoleKey()) {
      return (
        `Storage bucket "${STORAGE_BUCKET}" does not exist. ` +
        "Create a public bucket named cms-uploads in Supabase Storage, " +
        "or set SUPABASE_SERVICE_ROLE_KEY so the app can create it."
      );
    }

    logUploadStep("bucket-create-start", { bucket: STORAGE_BUCKET });
    const { error: createError } = await supabase.storage.createBucket(
      STORAGE_BUCKET,
      { public: true, fileSizeLimit: 26_214_400 },
    );

    if (createError) {
      logUploadStep("bucket-create-error", { message: createError.message });
      if (createError.message.toLowerCase().includes("already exists")) {
        return null;
      }
      return actionErrorMessage(
        `Could not create bucket "${STORAGE_BUCKET}": ${createError.message}`,
      );
    }

    logUploadStep("bucket-create-success", { bucket: STORAGE_BUCKET });
    return null;
  } catch (error) {
    logUploadStep("bucket-ensure-exception", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function uploadFileToStorage(
  file: File,
  folder: string,
): Promise<ActionResult<{ publicUrl: string; path: string }>> {
  if (needsServiceRoleForWrites()) {
    logUploadStep("blocked-no-service-role");
    return { success: false, error: UPLOAD_SERVICE_ROLE_REQUIRED_MSG };
  }

  if (!file || file.size <= 0) {
    return { success: false, error: "No file provided or file is empty." };
  }

  if (file.size > 26_214_400) {
    return { success: false, error: "File is too large (max 25MB)." };
  }

  if (isLocalDevStorage()) {
    try {
      logUploadStep("local-upload-start", { folder, name: file.name, size: file.size });
      const { url, storagePath } = await saveLocalUpload(file, folder);
      await registerLocalMediaAsset(file, folder, storagePath, url);
      revalidateTag(CACHE_TAGS.media);
      logUploadStep("local-upload-success", { path: storagePath });
      return { success: true, data: { publicUrl: url, path: storagePath } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Local upload failed";
      logUploadStep("local-upload-error", { message });
      return { success: false, error: message };
    }
  }

  const supabase = await createStorageWriteClient();
  const bucketError = await ensureCmsUploadsBucket(supabase);
  if (bucketError) {
    return { success: false, error: bucketError };
  }

  const ext = extensionFromFile(file);
  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "") || "general";
  const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  logUploadStep("supabase-upload-start", {
    folder: safeFolder,
    path,
    size: file.size,
    type: file.type,
    hasServiceRole: !!getServiceRoleKey(),
  });

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    const hint = error.message.includes("row-level security")
      ? RLS_DEV_HINT
      : "";
    logUploadStep("supabase-upload-error", { message: error.message, path });
    console.error("[upload]", error.message, { path, folder: safeFolder });
    return { success: false, error: actionErrorMessage(error.message + hint) };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const urlError = assertPersistableMediaUrl(publicUrl, "Upload");
  if (urlError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    logUploadStep("invalid-public-url", { path, publicUrl });
    return { success: false, error: urlError };
  }

  logUploadStep("supabase-upload-success", { path, publicUrl });
  return { success: true, data: { publicUrl, path } };
}

export async function uploadFileAndRegisterAsset(
  file: File,
  folder: string,
  filename?: string,
): Promise<ActionResult<{ publicUrl: string; path: string; assetId?: string }>> {
  const uploaded = await uploadFileToStorage(file, folder);
  if (!uploaded.success) {
    return uploaded;
  }

  if (isLocalDevStorage()) {
    return {
      success: true,
      data: {
        publicUrl: uploaded.data.publicUrl,
        path: uploaded.data.path,
      },
    };
  }

  const supabase = await createStorageWriteClient();
  const displayName = filename || file.name;

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      filename: displayName,
      url: uploaded.data.publicUrl,
      storage_path: uploaded.data.path,
      mime_type: file.type,
      size_bytes: file.size,
      folder,
    })
    .select("id")
    .single();

  if (error) {
    logUploadStep("media-asset-insert-error", { message: error.message });
    console.error("[upload:media_assets]", error.message);
    // Keep the file in storage — product can still use the public URL.
    // Asset registry failure should not block product images.
    return {
      success: true,
      data: {
        publicUrl: uploaded.data.publicUrl,
        path: uploaded.data.path,
      },
    };
  }

  revalidateTag(CACHE_TAGS.media);
  revalidateTag(CACHE_TAGS.dashboard);

  return {
    success: true,
    data: {
      publicUrl: uploaded.data.publicUrl,
      path: uploaded.data.path,
      assetId: data.id,
    },
  };
}
