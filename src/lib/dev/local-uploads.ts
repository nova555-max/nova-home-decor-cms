import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOADS_ROOT = path.join(process.cwd(), ".data", "uploads");
const MEDIA_INDEX = path.join(process.cwd(), ".data", "media-assets.json");

export type LocalMediaRecord = {
  id: string;
  filename: string;
  url: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  folder: string;
  created_at: string;
};

import { isLocalDevCms } from "@/lib/dev/local-mode";

/** Dev login without service role — Supabase Storage RLS blocks anon uploads. */
export function isLocalDevStorage(): boolean {
  return isLocalDevCms();
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;

  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  return byType[file.type] ?? "jpg";
}

export async function saveLocalUpload(
  file: File,
  folder: string,
): Promise<{ url: string; storagePath: string }> {
  const ext = extensionFromFile(file);
  const storagePath = `${folder}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const absolutePath = path.join(UPLOADS_ROOT, storagePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  const url = `/api/dev-uploads/${storagePath.replace(/\\/g, "/")}`;
  return { url, storagePath };
}

export async function readLocalUpload(
  relativePath: string,
): Promise<Buffer | null> {
  const safeRoot = path.resolve(UPLOADS_ROOT);
  const absolutePath = path.resolve(UPLOADS_ROOT, relativePath);
  if (!absolutePath.startsWith(safeRoot)) return null;

  try {
    return await readFile(absolutePath);
  } catch {
    return null;
  }
}

async function readMediaIndex(): Promise<LocalMediaRecord[]> {
  try {
    const raw = await readFile(MEDIA_INDEX, "utf8");
    return JSON.parse(raw) as LocalMediaRecord[];
  } catch {
    return [];
  }
}

async function writeMediaIndex(items: LocalMediaRecord[]) {
  await mkdir(path.dirname(MEDIA_INDEX), { recursive: true });
  await writeFile(MEDIA_INDEX, JSON.stringify(items, null, 2), "utf8");
}

export async function registerLocalMediaAsset(
  file: File,
  folder: string,
  storagePath: string,
  url: string,
): Promise<LocalMediaRecord> {
  const record: LocalMediaRecord = {
    id: randomBytes(8).toString("hex"),
    filename: file.name,
    url,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    folder,
    created_at: new Date().toISOString(),
  };

  const items = await readMediaIndex();
  items.unshift(record);
  await writeMediaIndex(items);
  return record;
}

export async function listLocalMediaAssets(): Promise<LocalMediaRecord[]> {
  return readMediaIndex();
}

export async function renameLocalMediaAsset(
  id: string,
  filename: string,
): Promise<LocalMediaRecord | null> {
  const items = await readMediaIndex();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], filename };
  await writeMediaIndex(items);
  return items[index];
}

export async function softDeleteLocalMediaAsset(id: string): Promise<boolean> {
  const items = await readMediaIndex();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeMediaIndex(next);
  return true;
}

export function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
  };
  return map[ext] ?? "application/octet-stream";
}
