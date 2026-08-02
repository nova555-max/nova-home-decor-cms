const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "svg",
  "avif",
  "heic",
  "heif",
  "tif",
  "tiff",
]);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 2560;

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function drawOptimizedImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  fileName: string,
  quality = 0.88,
): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#F8F7F2";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  const baseName = fileName.replace(/\.[^.]+$/, "") || "image";

  const webpBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (webpBlob && webpBlob.size > 0) {
    return new File([webpBlob], `${baseName}.webp`, { type: "image/webp" });
  }

  const jpegBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!jpegBlob) return null;

  return new File([jpegBlob], `${baseName}.jpg`, { type: "image/jpeg" });
}

/** Resize/compress when possible; always returns a usable file for upload */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error("INVALID_IMAGE");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  if (file.type === "image/svg+xml") {
    return file;
  }

  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(
        1,
        MAX_EDGE / Math.max(bitmap.width, bitmap.height),
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const converted = await drawOptimizedImage(bitmap, width, height, file.name);
      bitmap.close();
      if (converted && converted.size <= file.size * 1.1) {
        return converted;
      }
    }
  } catch {
    // Fall through to HTMLImageElement loader
  }

  try {
    const img = await loadImageFromFile(file);
    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const converted = await drawOptimizedImage(img, width, height, file.name);
    if (converted) return converted;
  } catch {
    // Use original bytes (HEIC, exotic formats, etc.)
  }

  return file;
}

/** Crop empty white/black padding from logo-like images before upload. */
export async function trimImageWhitespace(file: File): Promise<File> {
  if (!isImageFile(file)) return file;

  try {
    const img = await loadImageFromFile(file);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0);
    const { data: px } = ctx.getImageData(0, 0, w, h);

    const isEmpty = (i: number) => {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const a = px[i + 3];
      if (a < 12) return true;
      if (r > 245 && g > 245 && b > 245) return true;
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

    const pad = 10;
    const sx = Math.max(0, left - pad);
    const sy = Math.max(0, top - pad);
    const sw = Math.min(w - sx, right - left + 1 + pad * 2);
    const sh = Math.min(h - sy, bottom - top + 1 + pad * 2);

    if (sw > w * 0.92 && sh > h * 0.92) return file;
    if (sw < 8 || sh < 8) return file;

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d");
    if (!octx) return file;
    octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, "image/png"),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "logo";
    return new File([blob], `${base}.png`, { type: "image/png" });
  } catch {
    return file;
  }
}

/** @deprecated Use prepareImageForUpload */
export async function compressImage(file: File): Promise<File> {
  try {
    return await prepareImageForUpload(file);
  } catch {
    if (file.type.startsWith("image/") && file.size <= MAX_UPLOAD_BYTES) {
      return file;
    }
    throw new Error("INVALID_IMAGE");
  }
}

export async function cropImageToAspect(
  file: File,
  aspectRatio = 1,
): Promise<File> {
  if (!isImageFile(file)) return file;

  try {
    const img = await loadImageFromFile(file);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const srcAspect = srcW / srcH;

    let cropW = srcW;
    let cropH = srcH;
    let sx = 0;
    let sy = 0;

    if (srcAspect > aspectRatio) {
      cropW = Math.round(srcH * aspectRatio);
      sx = Math.round((srcW - cropW) / 2);
    } else {
      cropH = Math.round(srcW / aspectRatio);
      sy = Math.round((srcH - cropH) / 2);
    }

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type || "image/jpeg", 0.92),
    );
    if (!blob) return file;

    return new File([blob], file.name, { type: file.type || "image/jpeg" });
  } catch {
    return file;
  }
}
