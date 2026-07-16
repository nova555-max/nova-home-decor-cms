"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SmartImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fit?: "contain" | "cover";
  onError?: () => void;
};

export function SmartImage({
  src,
  alt,
  className,
  fit = "contain",
  onError,
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex h-full w-full items-center justify-center",
          className,
        )}
        aria-label={alt}
      >
        <ImageIcon className="size-8 opacity-40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(
        "block h-full w-full",
        fit === "contain" ? "object-contain" : "object-cover",
        className,
      )}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}
