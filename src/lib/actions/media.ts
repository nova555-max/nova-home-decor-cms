"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS, STORAGE_BUCKET } from "@/lib/constants";
import { actionErrorMessage } from "@/lib/actions/action-utils";
import type { ActionResult } from "@/lib/actions/action-types";
import {
  isLocalDevStorage,
  registerLocalMediaAsset,
  renameLocalMediaAsset,
  saveLocalUpload,
  softDeleteLocalMediaAsset,
} from "@/lib/dev/local-uploads";
import {
  needsServiceRoleForWrites,
  UPLOAD_SERVICE_ROLE_REQUIRED_MSG,
} from "@/lib/dev/local-mode";
import { logActionError } from "@/lib/actions/action-helpers";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { createStorageWriteClient } from "@/lib/supabase/storage-client";
import { requirePermission } from "@/lib/supabase/auth";
import {
  uploadFileAndRegisterAsset,
  uploadFileToStorage,
} from "@/lib/upload/server-upload";
import type { MediaAsset } from "@/types/database";

function revalidateMedia() {
  revalidateTag(CACHE_TAGS.media);
  revalidateTag(CACHE_TAGS.dashboard);
}

export async function uploadMediaAsset(
  formData: FormData,
): Promise<ActionResult<MediaAsset>> {
  await requirePermission("media");
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "media";
  const filename =
    (formData.get("filename") as string) || file?.name || "image";

  if (!file) return { success: false, error: "No file provided" };

  if (needsServiceRoleForWrites()) {
    return { success: false, error: UPLOAD_SERVICE_ROLE_REQUIRED_MSG };
  }

  if (isLocalDevStorage()) {
    try {
      const { url, storagePath } = await saveLocalUpload(file, folder);
      const record = await registerLocalMediaAsset(
        file,
        folder,
        storagePath,
        url,
      );
      revalidateMedia();
      return {
        success: true,
        data: {
          id: record.id,
          filename: record.filename,
          url: record.url,
          storage_path: record.storage_path,
          mime_type: record.mime_type,
          size_bytes: record.size_bytes,
          folder: record.folder,
          created_at: record.created_at,
          updated_at: record.created_at,
          deleted_at: null,
          alt_text: null,
          tags: [],
        } as MediaAsset,
      };
    } catch (error) {
      logActionError("upload-media-asset", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Local upload failed",
      };
    }
  }

  const uploaded = await uploadFileAndRegisterAsset(file, folder, filename);
  if (!uploaded.success) {
    logActionError("upload-media-asset", uploaded.error);
    return uploaded;
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", uploaded.data.assetId ?? "")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: actionErrorMessage(error?.message ?? "Media record not found."),
    };
  }

  revalidateMedia();
  return { success: true, data: data as MediaAsset };
}

export async function renameMediaAsset(
  id: string,
  filename: string,
): Promise<ActionResult<MediaAsset>> {
  await requirePermission("media");

  const trimmed = filename.trim();
  if (!trimmed) {
    return { success: false, error: "Filename is required." };
  }

  if (isLocalDevStorage()) {
    const record = await renameLocalMediaAsset(id, trimmed);
    if (!record) return { success: false, error: "Not found" };
    revalidateMedia();
    return {
      success: true,
      data: {
        id: record.id,
        filename: record.filename,
        url: record.url,
        storage_path: record.storage_path,
        mime_type: record.mime_type,
        size_bytes: record.size_bytes,
        folder: record.folder,
        created_at: record.created_at,
        updated_at: record.created_at,
        deleted_at: null,
        alt_text: null,
        tags: [],
      } as MediaAsset,
    };
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("media_assets")
    .update({ filename: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { success: false, error: actionErrorMessage(error.message) };
  revalidateMedia();
  return { success: true, data: data as MediaAsset };
}

export async function deleteMediaAsset(id: string): Promise<ActionResult> {
  await requirePermission("media");

  if (isLocalDevStorage()) {
    const deleted = await softDeleteLocalMediaAsset(id);
    if (!deleted) return { success: false, error: "Not found" };
    revalidateMedia();
    return { success: true };
  }

  const supabase = await createCmsClient();
  const { error } = await supabase
    .from("media_assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: actionErrorMessage(error.message) };
  revalidateMedia();
  return { success: true };
}

export async function replaceMediaAsset(
  id: string,
  formData: FormData,
): Promise<ActionResult<MediaAsset>> {
  await requirePermission("media");
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  if (needsServiceRoleForWrites()) {
    return { success: false, error: UPLOAD_SERVICE_ROLE_REQUIRED_MSG };
  }

  const supabase = await createCmsClient();
  const { data: existing, error: fetchError } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: fetchError?.message ?? "Not found" };
  }

  const uploaded = await uploadFileToStorage(file, existing.folder);
  if (!uploaded.success) {
    return uploaded;
  }

  const { data, error } = await supabase
    .from("media_assets")
    .update({
      url: uploaded.data.publicUrl,
      storage_path: uploaded.data.path,
      mime_type: file.type,
      size_bytes: file.size,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const storageClient = await createStorageWriteClient();
    await storageClient.storage
      .from(STORAGE_BUCKET)
      .remove([uploaded.data.path]);
    return { success: false, error: actionErrorMessage(error.message) };
  }

  if (existing.storage_path) {
    const storageClient = await createStorageWriteClient();
    await storageClient.storage
      .from(STORAGE_BUCKET)
      .remove([existing.storage_path]);
  }

  revalidateMedia();
  return { success: true, data: data as MediaAsset };
}
