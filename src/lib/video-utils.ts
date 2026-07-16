const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export { MAX_VIDEO_SECONDS, MAX_VIDEO_BYTES };

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? VIDEO_EXTENSIONS.has(ext) : false;
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("INVALID_VIDEO"));
        return;
      }
      resolve(duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("INVALID_VIDEO"));
    };

    video.src = url;
  });
}

export async function prepareVideoForUpload(file: File): Promise<File> {
  if (!isVideoFile(file)) {
    throw new Error("INVALID_VIDEO");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const duration = await getVideoDuration(file);
  if (duration > MAX_VIDEO_SECONDS + 0.05) {
    throw new Error("VIDEO_TOO_LONG");
  }

  return file;
}
