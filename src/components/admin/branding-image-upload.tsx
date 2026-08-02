"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  saveBrandingUrl,
  type BrandingField,
} from "@/lib/actions/cms";
import { uploadBrandingWithRetry } from "@/lib/upload/client-upload";
import { isInvalidPersistedMediaUrl } from "@/lib/media/storage-url";
import { isImageFile, prepareImageForUpload, trimImageWhitespace } from "@/lib/image-utils";
import { refreshPreservingScroll } from "@/lib/navigation/refresh-preserving-scroll";
import type { WebsiteSettings } from "@/types/database";
import { useAdminT } from "@/hooks";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BrandingImageUploadProps = {
  field: BrandingField;
  value?: string | null;
  label?: string;
  className?: string;
  onSettingsUpdated?: (settings: WebsiteSettings) => void;
};

export function BrandingImageUpload({
  field,
  value,
  label,
  className,
  onSettingsUpdated,
}: BrandingImageUploadProps) {
  const t = useAdminT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    startTransition(async () => {
      try {
        const preparedBase = await prepareImageForUpload(file);
        const prepared =
          field === "company_logo"
            ? await trimImageWhitespace(preparedBase)
            : preparedBase;
        const result = await uploadBrandingWithRetry(prepared, field);
        if (result.success && result.data) {
          onSettingsUpdated?.(result.data.settings);
          toast.success(t("common.saved"));
          refreshPreservingScroll(router);
        } else if (!result.success) {
          toast.error(result.error);
        }
      } catch {
        toast.error(t("media.invalid_file"));
      } finally {
        uploadingRef.current = false;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
    });
  };

  const clearImage = () => {
    startTransition(async () => {
      const result = await saveBrandingUrl(field, null);
      if (result.success && result.data) {
        onSettingsUpdated?.(result.data);
        toast.success(t("common.saved"));
        refreshPreservingScroll(router);
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const displayUrl =
    value && !isInvalidPersistedMediaUrl(value) ? value : previewUrl;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <div
          role="button"
          tabIndex={isPending ? -1 : 0}
          onClick={() => !isPending && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "border-border bg-muted/30 relative flex min-h-44 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            isPending && "pointer-events-none opacity-80",
          )}
        >
          {displayUrl ? (
            <div className="relative flex h-44 w-full items-center justify-center p-3 md:h-56">
              <SmartImage
                src={displayUrl}
                alt={label ?? field}
                fit="contain"
                className="max-h-full max-w-full"
              />
              {isPending ? (
                <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
                  <Loader2 className="text-primary size-6 animate-spin" />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center text-sm">
              {isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Upload className="size-5" />
              )}
              <span className="font-medium">{label ?? t("common.upload")}</span>
              <span className="text-xs opacity-70">{t("media.drop_hint")}</span>
            </div>
          )}
        </div>
        {value && !isPending ? (
          <Button
            type="button"
            size="icon-xs"
            variant="destructive"
            className="absolute end-2 top-2 z-10 rounded-lg"
            onClick={(event) => {
              event.stopPropagation();
              clearImage();
            }}
          >
            <X className="size-3" />
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.webp,.avif,.svg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadFile(file);
          event.target.value = "";
        }}
      />
      {value && isInvalidPersistedMediaUrl(value) ? (
        <p className="text-destructive text-xs">
          {t("settings.branding_invalid_url")}
        </p>
      ) : null}
    </div>
  );
}
