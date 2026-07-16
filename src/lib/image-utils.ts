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
