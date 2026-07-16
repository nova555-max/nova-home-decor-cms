import { CACHE_TAGS, STORAGE_BUCKET } from "@/lib/constants";
import { revalidateTag } from "next/cache";

import { actionErrorMessage } from "@/lib/actions/action-utils";
import {
  isLocalDevStorage,
  registerLocalMediaAsset,
  saveLocalUpload,
} from "@/lib/dev/local-uploads";
import { needsServiceRoleForWrites, RLS_DEV_HINT, UPLOAD_SERVICE_ROLE_REQUIRED_MSG } from "@/lib/dev/local-mode";
import { assertPersistableMediaUrl } from "@/lib/media/storage-url";
import { logUploadStep } from "@/lib/settings/persist-settings";
import { createStorageWriteClient } from "@/lib/supabase/storage-client";
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

export async function uploadFileToStorage(
  file: File,
  folder: string,
): Promise<ActionResult<{ publicUrl: string; path: string }>> {
  if (needsServiceRoleForWrites()) {
    return { success: false, error: UPLOAD_SERVICE_ROLE_REQUIRED_MSG };
  }

  if (isLocalDevStorage()) {
    try {
      const { url, storagePath } = await saveLocalUpload(file, folder);
      await registerLocalMediaAsset(file, folder, storagePath, url);
      revalidateTag(CACHE_TAGS.media);
      return { success: true, data: { publicUrl: url, path: storagePath } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Local upload failed",
      };
    }
  }

  const supabase = await createStorageWriteClient();
  const ext = extensionFromFile(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  logUploadStep("supabase-upload-start", { folder, path });

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
    logUploadStep("supabase-upload-error", { message: error.message });
    return { success: false, error: actionErrorMessage(error.message + hint) };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const urlError = assertPersistableMediaUrl(publicUrl, "Upload");
  if (urlError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    logUploadStep("invalid-public-url", { path });
    return { success: false, error: urlError };
  }

  logUploadStep("supabase-upload-success", { path });
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
    const storageClient = await createStorageWriteClient();
    await storageClient.storage
      .from(STORAGE_BUCKET)
      .remove([uploaded.data.path]);
    return { success: false, error: actionErrorMessage(error.message) };
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
