import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

import { buildDefaultContentStore } from "@/lib/content/registry";
import type {
  ContentStringStore,
  ContentVersionSnapshot,
  WebsiteContentStrings,
} from "@/types/content";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "content-strings.json");

type LocalFile = {
  id: string;
  drafts: ContentStringStore;
  published: ContentStringStore;
  versions: ContentVersionSnapshot[];
  updated_at: string;
};

async function ensureFile(): Promise<LocalFile> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as LocalFile;
  } catch {
    const defaults = buildDefaultContentStore();
    const initial: LocalFile = {
      id: "local-content",
      drafts: defaults,
      published: defaults,
      versions: [],
      updated_at: new Date().toISOString(),
    };
    await writeFile(FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function save(file: LocalFile) {
  file.updated_at = new Date().toISOString();
  await writeFile(FILE, JSON.stringify(file, null, 2), "utf8");
}

export async function getLocalContentStrings(): Promise<WebsiteContentStrings> {
  const file = await ensureFile();
  return { ...file, keyHistory: [] };
}

export async function saveLocalContentStrings(
  patch: Partial<Pick<WebsiteContentStrings, "drafts" | "published" | "versions">>,
): Promise<WebsiteContentStrings> {
  const file = await ensureFile();
  if (patch.drafts) file.drafts = patch.drafts;
  if (patch.published) file.published = patch.published;
  if (patch.versions) file.versions = patch.versions;
  await save(file);
  return { ...file, keyHistory: [] };
}
