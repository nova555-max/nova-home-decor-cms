"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { isImageFile, prepareImageForUpload } from "@/lib/image-utils";
import { uploadImageWithRetry } from "@/lib/upload/client-upload";
import { useAdminT } from "@/hooks";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MultiImageUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
  className?: string;
};

export function MultiImageUpload({
  value,
  onChange,
  folder = "products",
  max = 8,
  className,
}: MultiImageUploadProps) {
  const t = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const uploadingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const uploadFiles = (files: FileList | File[]) => {
    if (uploadingRef.current || isPending) return;

    const remaining = max - valueRef.current.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (!toUpload.length) return;

    uploadingRef.current = true;
    setProgress({ current: 0, total: toUpload.length });

    startTransition(async () => {
      let failed = 0;

      for (const file of toUpload) {
        if (!isImageFile(file)) {
          toast.error(t("media.invalid_file"));
          failed += 1;
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

          const result = await uploadImageWithRetry(formData);
          if (result.success && result.data) {
            const next = [...valueRef.current, result.data];
            valueRef.current = next;
            onChange(next);
          } else if (!result.success) {
            failed += 1;
            toast.error(result.error);
          }
        } catch (error) {
          failed += 1;
          const message =
            error instanceof Error && error.message === "FILE_TOO_LARGE"
              ? t("media.file_too_large")
              : t("media.invalid_file");
          toast.error(message);
        }

        setProgress((prev) =>
          prev ? { ...prev, current: prev.current + 1 } : prev,
        );
      }

      const added = valueRef.current.length - value.length;
      if (added > 0) {
        toast.success(`${t("media.upload")}: ${added}`);
      } else if (failed) {
        toast.error(t("media.upload_failed"));
      }

      uploadingRef.current = false;
      setProgress(null);
    });
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
