"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { isImageFile, prepareImageForUpload } from "@/lib/image-utils";
import { uploadImageWithRetry } from "@/lib/upload/client-upload";
import { useAdminT } from "@/hooks";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FailedUpload = {
  id: string;
  file: File;
  error: string;
};

type MultiImageUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
  className?: string;
  onUploadingChange?: (uploading: boolean) => void;
  onUploadFailure?: (error: string) => void;
  onUploadSuccess?: () => void;
};

export function MultiImageUpload({
  value,
  onChange,
  folder = "products",
  max = 8,
  className,
  onUploadingChange,
  onUploadFailure,
  onUploadSuccess,
}: MultiImageUploadProps) {
  const t = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const uploadingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [failed, setFailed] = useState<FailedUpload[]>([]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onUploadingChange?.(isPending);
  }, [isPending, onUploadingChange]);

  const runUploadQueue = (items: FailedUpload[]) => {
    if (uploadingRef.current || isPending || !items.length) return;

    const remaining = max - valueRef.current.length;
    const queue = items.slice(0, remaining);
    if (!queue.length) return;

    uploadingRef.current = true;
    onUploadingChange?.(true);
    setProgress({ current: 0, total: queue.length });

    startTransition(async () => {
      let failedCount = 0;
      let addedCount = 0;
      let lastError = "";
      const stillFailed: FailedUpload[] = [];
      const queuedIds = new Set(queue.map((q) => q.id));

      for (const item of queue) {
        const { file } = item;

        if (!isImageFile(file)) {
          failedCount += 1;
          lastError = t("media.invalid_file");
          stillFailed.push({ ...item, error: lastError });
          toast.error(lastError);
          setProgress((prev) =>
            prev ? { ...prev, current: prev.current + 1 } : prev,
          );
          continue;
        }

        try {
          const prepared = await prepareImageForUpload(file);
          const formData = new FormData();
          formData.append("file", prepared);
          formData.append("folder", folder);

          const result = await uploadImageWithRetry(formData, {
            onProgress: ({ attempt, maxAttempts }) => {
              if (attempt > 1 && process.env.NODE_ENV === "development") {
                console.info("[upload:retry]", {
                  name: file.name,
                  attempt,
                  maxAttempts,
                });
              }
            },
          });

          if (result.success && result.data) {
            const next = [...valueRef.current, result.data];
            valueRef.current = next;
            onChange(next);
            addedCount += 1;
          } else if (!result.success) {
            failedCount += 1;
            lastError = result.error;
            stillFailed.push({ ...item, error: result.error });
            toast.error(result.error);
            if (process.env.NODE_ENV === "development") {
              console.error("[upload:failed]", result.error, file.name);
            }
          }
        } catch (error) {
          failedCount += 1;
          const message =
            error instanceof Error && error.message === "FILE_TOO_LARGE"
              ? t("media.file_too_large")
              : error instanceof Error
                ? error.message
                : t("media.invalid_file");
          lastError = message;
          stillFailed.push({ ...item, error: message });
          toast.error(message);
        }

        setProgress((prev) =>
          prev ? { ...prev, current: prev.current + 1 } : prev,
        );
      }

      setFailed((prev) => [
        ...prev.filter((p) => !queuedIds.has(p.id)),
        ...stillFailed,
      ]);

      if (addedCount > 0) {
        toast.success(`${t("media.upload")}: ${addedCount}`);
        onUploadSuccess?.();
      }
      if (failedCount > 0) {
        onUploadFailure?.(lastError || t("media.upload_failed"));
        if (addedCount === 0) {
          toast.error(t("media.upload_failed"));
        }
      }

      uploadingRef.current = false;
      onUploadingChange?.(false);
      setProgress(null);
    });
  };

  const uploadFiles = (files: FileList | File[]) => {
    const remaining = max - valueRef.current.length;
    const list = Array.from(files)
      .slice(0, remaining)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        error: "",
      }));
    runUploadQueue(list);
  };

  const remove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    valueRef.current = next;
    onChange(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3",
          dragOver && "rounded-2xl ring-2 ring-primary/30",
        )}
      >
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="bg-muted relative flex aspect-square items-center justify-center overflow-hidden rounded-xl p-2"
          >
            <SmartImage src={url} alt="" fit="contain" />
            <Button
              type="button"
              size="icon-xs"
              variant="destructive"
              className="absolute end-1 top-1 z-10"
              disabled={isPending}
              onClick={() => remove(index)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
      </div>

      {progress ? (
        <div className="space-y-1.5">
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--gold)] transition-all duration-300"
              style={{
                width: `${Math.round(
                  (progress.current / Math.max(progress.total, 1)) * 100,
                )}%`,
              }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {t("media.uploading")} {progress.current}/{progress.total}
          </p>
        </div>
      ) : null}

      {failed.length ? (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-destructive text-xs font-medium">
            {t("media.upload_failed")} ({failed.length})
          </p>
          <ul className="space-y-1.5">
            {failed.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  {item.file.name}: {item.error}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 rounded-lg"
                  disabled={isPending}
                  onClick={() => runUploadQueue([item])}
                >
                  <RotateCcw className="size-3" />
                  {t("media.retry")}
                </Button>
              </li>
            ))}
          </ul>
          {failed.length > 1 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-lg"
              disabled={isPending}
              onClick={() => runUploadQueue(failed)}
            >
              <RotateCcw className="size-3.5" />
              {t("media.retry_all")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {value.length < max ? (
        <>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            className="rounded-xl"
            onClick={() => inputRef.current?.click()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {progress
              ? `${t("media.uploading")} ${progress.current}/${progress.total}`
              : `${t("media.add_images")} (${value.length}/${max})`}
          </Button>
          <p className="text-muted-foreground text-xs">
            {t("media.any_format")}
          </p>
        </>
      ) : null}
    </div>
  );
}
