"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type SiteBrandLogoProps = {
  logoUrl?: string | null;
  companyName: string;
  href?: string;
  size?: "header" | "header-scrolled" | "footer" | "admin";
  className?: string;
  /** Logo files usually already include the wordmark — hide duplicate name. */
  showNameWithLogo?: boolean;
  nameClassName?: string;
  priority?: boolean;
};

const HEIGHT: Record<NonNullable<SiteBrandLogoProps["size"]>, string> = {
  header: "h-14 sm:h-16 md:h-[4.25rem]",
  "header-scrolled": "h-11 sm:h-12",
  footer: "h-16 sm:h-[4.75rem]",
  admin: "h-10",
};

/**
 * Detect near-white / near-black empty borders and crop to the real mark.
 * Fixes logos exported with huge canvas padding.
 */
export async function trimLogoCanvas(
  sourceUrl: string,
): Promise<{ url: string; width: number; height: number } | null> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("logo load failed"));
    el.src = sourceUrl;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w < 8 || h < 8) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    // CORS — fall back to original
    return { url: sourceUrl, width: w, height: h };
  }

  const { data: px } = data;
  const isEmpty = (i: number) => {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const a = px[i + 3];
    if (a < 12) return true;
    // near white
    if (r > 245 && g > 245 && b > 245) return true;
    // near black (accidental letterbox bars)
    if (r < 12 && g < 12 && b < 12) return true;
    return false;
  };

  let top = 0;
  let bottom = h - 1;
  let left = 0;
  let right = w - 1;

  outerTop: for (; top < h; top += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!isEmpty((top * w + x) * 4)) break outerTop;
    }
  }
  outerBottom: for (; bottom > top; bottom -= 1) {
    for (let x = 0; x < w; x += 1) {
      if (!isEmpty((bottom * w + x) * 4)) break outerBottom;
    }
  }
  outerLeft: for (; left < w; left += 1) {
    for (let y = top; y <= bottom; y += 1) {
      if (!isEmpty((y * w + left) * 4)) break outerLeft;
    }
  }
  outerRight: for (; right > left; right -= 1) {
    for (let y = top; y <= bottom; y += 1) {
      if (!isEmpty((y * w + right) * 4)) break outerRight;
    }
  }

  const pad = 8;
  const sx = Math.max(0, left - pad);
  const sy = Math.max(0, top - pad);
  const sw = Math.min(w - sx, right - left + 1 + pad * 2);
  const sh = Math.min(h - sy, bottom - top + 1 + pad * 2);

  // If trim barely changed anything, keep original
  if (sw > w * 0.92 && sh > h * 0.92) {
    return { url: sourceUrl, width: w, height: h };
  }
  if (sw < 8 || sh < 8) {
    return { url: sourceUrl, width: w, height: h };
  }

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const octx = out.getContext("2d");
  if (!octx) return { url: sourceUrl, width: w, height: h };
  octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, "image/png"),
  );
  if (!blob) return { url: sourceUrl, width: w, height: h };

  return { url: URL.createObjectURL(blob), width: sw, height: sh };
}

export function SiteBrandLogo({
  logoUrl,
  companyName,
  href = "/",
  size = "header",
  className,
  showNameWithLogo = false,
  nameClassName,
  priority = false,
}: SiteBrandLogoProps) {
  const raw = logoUrl?.trim() || "";
  const [displayUrl, setDisplayUrl] = useState(raw);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    if (!raw) {
      setDisplayUrl("");
      return;
    }

    setDisplayUrl(raw);
    void trimLogoCanvas(raw)
      .then((result) => {
        if (cancelled || !result) return;
        if (result.url.startsWith("blob:")) created = result.url;
        setDisplayUrl(result.url);
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl(raw);
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [raw]);

  const hasLogo = !!raw;

  return (
    <Link
      href={href}
      className={cn("group inline-flex min-w-0 items-center gap-3", className)}
      aria-label={companyName}
    >
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl || raw}
          alt={companyName}
          className={cn(
            "w-auto max-w-[min(72vw,280px)] object-contain object-left transition duration-500 group-hover:opacity-90",
            HEIGHT[size],
            // Soft lift so gold mark reads on both light and dark heroes
            "[filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.12))]",
          )}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
      ) : (
        <span
          className={cn(
            "font-display font-medium tracking-tight",
            size === "footer" && "text-2xl",
            size === "header" && "text-xl md:text-2xl",
            size === "header-scrolled" && "text-lg",
            size === "admin" && "text-sm font-semibold",
            nameClassName,
          )}
        >
          {companyName}
        </span>
      )}
      {hasLogo && showNameWithLogo ? (
        <span
          className={cn(
            "truncate font-display font-medium tracking-tight",
            nameClassName,
          )}
        >
          {companyName}
        </span>
      ) : null}
    </Link>
  );
}
