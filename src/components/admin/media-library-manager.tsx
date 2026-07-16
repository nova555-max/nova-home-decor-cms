"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  deleteMediaAsset,
  renameMediaAsset,
} from "@/lib/actions/media";
import { isImageFile, prepareImageForUpload } from "@/lib/image-utils";
import { uploadMediaWithRetry } from "@/lib/upload/client-upload";
import type { MediaAsset } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MediaLibraryManagerProps = {
  assets: MediaAsset[];
};

export function MediaLibraryManager({ assets }: MediaLibraryManagerProps) {
  const t = useAdminT();
  const { direction } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState(() => (Array.isArray(assets) ? assets : []));
  const [filter, setFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked || uploadProgress !== null;

  const folders = useMemo(
    () => ["all", ...new Set(list.map((a) => a.folder))],
    [list],
  );

  const filtered = list.filter((asset) => {
    const matchesText = asset.filename
      .toLowerCase()
      .includes(filter.toLowerCase());
    const matchesFolder =
      folderFilter === "all" || asset.folder === folderFilter;
    return matchesText && matchesFolder;
  });

  const uploadFiles = (files: FileList | File[]) => {
    if (isBusy) return;

    const queue = Array.from(files).filter((file) => {
      if (!isImageFile(file)) {
        toast.error(t("media.invalid_file"));
        return false;
      }
      return true;
    });

    if (!queue.length) return;

    startTransition(async () => {
      await runLocked(async () => {
        setUploadProgress({ current: 0, total: queue.length });
        let succeeded = 0;

        for (const file of queue) {
          try {
            const prepared = await prepareImageForUpload(file);
            const formData = new FormData();
            formData.append("file", prepared);
            formData.append("folder", "media");
            formData.append("filename", file.name);

            const result = await uploadMediaWithRetry(formData, {
              onProgress: ({ attempt, maxAttempts }) => {
                if (attempt > 1) {
                  setUploadProgress((prev) =>
                    prev
                      ? {
                          ...prev,
                          current: prev.current,
                        }
                      : prev,
                  );
                }
                if (process.env.NODE_ENV === "development") {
                  console.info("[media] retry", { attempt, maxAttempts });
                }
              },
            });

            if (result.success && result.data) {
              succeeded += 1;
              setList((prev) => [result.data!, ...prev]);
            } else if (!result.success) {
              toast.error(result.error);
            }
          } catch {
            toast.error(t("media.invalid_file"));
          }

          setUploadProgress((prev) =>
            prev ? { ...prev, current: prev.current + 1 } : prev,
          );
        }

        setUploadProgress(null);
        if (succeeded > 0) {
          toast.success(t("common.saved"));
        } else if (queue.length) {
          toast.error(t("media.upload_failed"));
        }
      });
    });
  };

  const handleRename = () => {
    if (!renameId) return;
    const id = renameId;
    const filename = renameValue.trim();
    if (!filename) {
      toast.error(t("common.name"));
      return;
    }

    startTransition(async () => {
      await runLocked(async () => {
        const result = await renameMediaAsset(id, filename);
        if (result.success && result.data) {
          toast.success(t("common.saved"));
          setRenameId(null);
          setList((prev) =>
            prev.map((a) => (a.id === id ? result.data! : a)),
          );
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const id = deleteId;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteMediaAsset(id);
        if (result.success) {
          toast.success(t("common.deleted"));
          setDeleteId(null);
          setList((prev) => prev.filter((a) => a.id !== id));
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  return (
    <div className="space-y-6" dir={direction}>
      <AdminPageHeader
        titleKey="pages.media.title"
        subtitleKey="pages.media.subtitle"
        action={
          <Button
            className="rounded-xl"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploadProgress
              ? `${t("media.uploading")} ${uploadProgress.current}/${uploadProgress.total}`
              : t("media.upload")}
          </Button>
        }
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isBusy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "border-border/40 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
          isBusy && "pointer-events-none opacity-70",
        )}
      >
        {isBusy ? (
          <Loader2 className="text-primary size-8 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-8" />
        )}
        <p className="text-sm font-medium">
          {uploadProgress
            ? `${t("media.uploading")} ${uploadProgress.current}/${uploadProgress.total}`
            : t("media.drop_hint")}
        </p>
        <p className="text-muted-foreground text-xs">{t("media.any_format")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.webp,.avif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("media.search")}
          className="max-w-xs rounded-xl"
        />
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => (
            <Button
              key={folder}
              type="button"
              size="sm"
              variant={folderFilter === folder ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setFolderFilter(folder)}
            >
              {folder === "all" ? t("media.library") : folder}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="border-border/40 overflow-hidden rounded-2xl border"
          >
            <div className="bg-muted relative aspect-square">
              <Image
                src={asset.url}
                alt={asset.filename}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-medium">{asset.filename}</p>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="rounded-lg">
                  {asset.folder}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => {
                      setRenameId(asset.id);
                      setRenameValue(asset.filename);
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="destructive"
                    disabled={isBusy}
                    onClick={() => setDeleteId(asset.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {renameId ? (
        <div className="border-border/40 flex flex-wrap items-center gap-2 rounded-2xl border p-4">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="max-w-sm rounded-xl"
            disabled={isBusy}
          />
          <Button
            className="rounded-xl"
            disabled={isBusy}
            onClick={handleRename}
          >
            {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={isBusy}
            onClick={() => setRenameId(null)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("media.delete_title")}
        description={t("common.confirm_delete")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={isBusy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
