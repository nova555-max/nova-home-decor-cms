"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";

import { uploadImageWithRetry } from "@/lib/upload/client-upload";
import {
  MAX_VIDEO_SECONDS,
  prepareVideoForUpload,
} from "@/lib/video-utils";
import { useAdminT } from "@/hooks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VideoUploadProps = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
};

export function VideoUpload({
  value,
  onChange,
  folder = "products",
  className,
}: VideoUploadProps) {
  const t = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = (file: File) => {
    if (isPending) return;

    startTransition(async () => {
      try {
        const prepared = await prepareVideoForUpload(file);
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
            ? t("media.video_too_large")
            : error instanceof Error && error.message === "VIDEO_TOO_LONG"
              ? t("media.video_too_long")
              : t("media.invalid_video");
        toast.error(message);
      }
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{t("media.add_video")}</p>
      {value ? (
        <div className="bg-muted relative overflow-hidden rounded-xl">
          <video
            src={value}
            controls
            playsInline
            className="aspect-video w-full object-contain"
          />
          <Button
            type="button"
            size="icon-xs"
            variant="destructive"
            className="absolute end-2 top-2 z-10"
            disabled={isPending}
            onClick={() => onChange(null)}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={isPending}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-border text-muted-foreground hover:bg-muted/40 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 transition",
              dragOver && "border-primary bg-primary/5",
              isPending && "pointer-events-none opacity-70",
            )}
          >
            {isPending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Video className="size-6" />
            )}
            <span className="text-sm font-medium text-foreground">
              {isPending ? t("media.uploading") : t("media.add_video")}
            </span>
            <span className="text-xs">
              {t("media.video_hint").replace(
                "{seconds}",
                String(MAX_VIDEO_SECONDS),
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Upload className="size-3.5" />
              MP4, WEBM, MOV
            </span>
          </button>
        </>
      )}
    </div>
  );
}
