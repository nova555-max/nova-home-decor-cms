"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Images, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { isImageFile, prepareImageForUpload } from "@/lib/image-utils";
import { uploadImageWithRetry } from "@/lib/upload/client-upload";
import type { MediaAsset } from "@/types/database";
import { useAdminT } from "@/hooks";
import { MediaLibraryPicker } from "@/components/admin/media-library-picker";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageUploadProps = {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  className?: string;
  mediaAssets?: MediaAsset[];
};

export function ImageUpload({
  value,
  onChange,
  folder = "general",
  label,
  className,
  mediaAssets = [],
}: ImageUploadProps) {
  const t = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadFile = (file: File) => {
    if (uploadingRef.current || isPending) return;

    if (!isImageFile(file)) {
      toast.error(t("media.invalid_file"));
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localPreview;
    });

    uploadingRef.current = true;
    setStatusText(t("media.uploading"));

    startTransition(async () => {
      try {
        const prepared = await prepareImageForUpload(file);
        const formData = new FormData();
        formData.append("file", prepared);
        formData.append("folder", folder);

        const result = await uploadImageWithRetry(formData);
        if (result.success && result.data) {
          onChange(result.data);
          toast.success(t("media.upload"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message === "FILE_TOO_LARGE"
            ? t("media.file_too_large")
            : t("media.invalid_file");
        toast.error(message);
      } finally {
        uploadingRef.current = false;
        setStatusText(null);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
    });
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const displayUrl = value ?? previewUrl;

  const openFilePicker = () => {
    if (!isPending && !uploadingRef.current) inputRef.current?.click();
  };

  const onDropZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <div
          role="button"
          tabIndex={isPending ? -1 : 0}
          aria-disabled={isPending}
          onKeyDown={onDropZoneKeyDown}
          onClick={openFilePicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "border-border bg-muted/30 relative flex min-h-44 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            dragOver && "border-primary bg-primary/5",
            isPending && "pointer-events-none opacity-80",
          )}
        >
          {displayUrl ? (
            <div className="relative flex h-44 w-full items-center justify-center p-3 md:h-56">
              <SmartImage
                src={displayUrl}
                alt="Preview"
                fit="contain"
                className="max-h-full max-w-full"
              />
              {isPending ? (
                <div className="bg-background/70 absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="text-primary size-6 animate-spin" />
                  {statusText ? (
                    <span className="text-muted-foreground text-xs">
                      {statusText}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center text-sm">
              {isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {statusText ? (
                    <span className="text-xs">{statusText}</span>
                  ) : null}
                </>
              ) : (
                <Upload className="size-5" />
              )}
              <span className="font-medium">{label ?? t("common.upload")}</span>
              <span className="text-xs opacity-70">{t("media.drop_hint")}</span>
              <span className="text-xs opacity-60">
                {t("media.any_format")}
              </span>
            </div>
          )}
        </div>
        {value && !isPending ? (
          <Button
            type="button"
            size="icon-xs"
            variant="destructive"
            className="absolute end-2 top-2 z-10 rounded-lg"
            onClick={() => onChange(null)}
          >
            <X className="size-3" />
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.webp,.avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadFile(file);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
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
          {value ? t("media.replace") : t("common.upload")}
        </Button>
        {mediaAssets.length ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setPickerOpen(true)}
          >
            <Images className="size-4" />
            {t("media.library")}
          </Button>
        ) : null}
      </div>
      <MediaLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        assets={mediaAssets}
        onSelect={(url) => onChange(url)}
      />
    </div>
  );
}
