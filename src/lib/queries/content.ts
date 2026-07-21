import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { buildDefaultContentStore } from "@/lib/content/registry";
import {
  getLocalContentStrings,
  saveLocalContentStrings,
} from "@/lib/dev/local-content";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import {
  STARTUP_QUERY_TIMEOUT_MS,
  withTimeoutFallback,
} from "@/lib/fetch/with-timeout";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  ContentStringStore,
  ContentVersionHistoryEntry,
  ContentVersionSnapshot,
  LocalizedContentValue,
  WebsiteContentStrings,
} from "@/types/content";

type ContentRow = {
  id: string;
  content_key: string;
  draft_value: LocalizedContentValue;
  published_value: LocalizedContentValue;
  version: number;
  status: "draft" | "published";
  published_at: string | null;
  versions: ContentVersionSnapshot[];
  updated_at: string;
};

const EMPTY_ROW: WebsiteContentStrings = {
  id: "empty",
  drafts: {},
  published: {},
  versions: [],
  keyHistory: [],
  updated_at: new Date().toISOString(),
};

function rowsToStore(rows: ContentRow[]): {
  drafts: ContentStringStore;
  published: ContentStringStore;
} {
  const drafts: ContentStringStore = {};
  const published: ContentStringStore = {};
  for (const row of rows) {
    drafts[row.content_key] = row.draft_value ?? {};
    published[row.content_key] = row.published_value ?? {};
  }
  return { drafts, published };
}

async function fetchKeyVersionHistory(): Promise<ContentVersionHistoryEntry[]> {
  const supabase = await createCmsClient();
  const { data } = await supabase
    .from("website_content_version_history")
    .select(
      "id, content_string_id, content_key, version, previous_version, previous_value, current_value, change_type, created_by, updated_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as ContentVersionHistoryEntry[];
}

async function insertKeyVersionHistory(input: {
  content_string_id: string;
  content_key: string;
  version: number;
  previous_value: LocalizedContentValue | null;
  current_value: LocalizedContentValue;
  change_type: ContentVersionHistoryEntry["change_type"];
}): Promise<void> {
  const supabase = await createCmsClient();
  await supabase.from("website_content_version_history").insert({
    content_string_id: input.content_string_id,
    content_key: input.content_key,
    version: input.version,
    previous_version: input.version > 1 ? input.version - 1 : null,
    previous_value: input.previous_value,
    current_value: input.current_value,
    change_type: input.change_type,
  });
}

async function fetchPublishSnapshots(): Promise<ContentVersionSnapshot[]> {
  const supabase = await createCmsClient();
  const { data } = await supabase
    .from("website_content_publish_snapshots")
    .select("id, label, published, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    published: (row.published ?? {}) as ContentStringStore,
    created_at: row.created_at,
  }));
}

export async function ensureContentStringRows(): Promise<void> {
  if (isLocalDevCms()) return;

  const defaults = buildDefaultContentStore();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabase = serviceKey
    ? (await import("@/lib/supabase/admin")).createServiceClient()
    : await createCmsClient();
  const { data: existing } = await supabase
    .from("website_content_strings")
    .select("content_key");

  const existingKeys = new Set((existing ?? []).map((r) => r.content_key));
  const missing = Object.entries(defaults).filter(([key]) => !existingKeys.has(key));

  if (missing.length === 0) return;

  await supabase.from("website_content_strings").insert(
    missing.map(([content_key, value]) => ({
      content_key,
      draft_value: value,
      published_value: value,
      status: "published",
      published_at: new Date().toISOString(),
      version: 1,
    })),
  );
}

async function fetchContentRows(): Promise<ContentRow[]> {
  if (isLocalDevCms()) {
    const local = await getLocalContentStrings();
    return Object.keys(local.drafts).map((content_key) => ({
      id: `${content_key}-local`,
      content_key,
      draft_value: local.drafts[content_key] ?? {},
      published_value: local.published[content_key] ?? {},
      version: 1,
      status: "published" as const,
      published_at: local.updated_at,
      versions: [],
      updated_at: local.updated_at,
    }));
  }

  const supabase = createPublicClient();
  return withTimeoutFallback(
    (async () => {
      const viaView = await supabase
        .from("website_content_strings_public")
        .select(
          "id, content_key, published_value, version, status, published_at, updated_at",
        );

      const rows =
        !viaView.error && viaView.data?.length
          ? viaView.data
          : (
              await supabase
                .from("website_content_strings")
                .select(
                  "id, content_key, published_value, version, status, published_at, updated_at",
                )
                .eq("status", "published")
            ).data;

      if (!rows?.length) return [];
      return rows.map((row) => ({
        ...row,
        draft_value: row.published_value ?? {},
        versions: [],
      })) as ContentRow[];
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    [],
    "fetchContentRows",
  );
}

export const getPublishedContentStrings = unstable_cache(
  async () => {
    const rows = await fetchContentRows();
    if (!rows.length) return buildDefaultContentStore();
    const { published } = rowsToStore(rows);
    return Object.keys(published).length ? published : buildDefaultContentStore();
  },
  ["published-content-strings"],
  { tags: [CACHE_TAGS.content], revalidate: 60 },
);

export async function getAdminContentStrings(): Promise<WebsiteContentStrings> {
  if (isLocalDevCms()) {
    return getLocalContentStrings();
  }

  await ensureContentStringRows();

  const supabase = await createCmsClient();
  const [rowsResult, versions, keyHistory] = await Promise.all([
    supabase
      .from("website_content_strings")
      .select(
        "id, content_key, draft_value, published_value, version, status, published_at, versions, updated_at",
      )
      .order("content_key"),
    fetchPublishSnapshots(),
    fetchKeyVersionHistory(),
  ]);

  const rows = (rowsResult.data ?? []) as ContentRow[];
  if (rowsResult.error || rows.length === 0) {
    const defaults = buildDefaultContentStore();
    return {
      id: "new",
      drafts: defaults,
      published: defaults,
      versions,
      keyHistory,
      updated_at: new Date().toISOString(),
    };
  }

  const { drafts, published } = rowsToStore(rows);
  const defaults = buildDefaultContentStore();

  return {
    id: "aggregate",
    drafts: { ...defaults, ...drafts },
    published: { ...defaults, ...published },
    versions,
    keyHistory,
    updated_at: rows.reduce(
      (latest, row) =>
        row.updated_at > latest ? row.updated_at : latest,
      rows[0].updated_at,
    ),
  };
}

async function upsertRows(
  drafts: ContentStringStore,
  published: ContentStringStore,
  options: {
    publish?: boolean;
    unpublish?: boolean;
    restoreDraft?: boolean;
  } = {},
): Promise<void> {
  const { publish = false, unpublish = false, restoreDraft = false } = options;
  const supabase = await createCmsClient();
  const keys = new Set([...Object.keys(drafts), ...Object.keys(published)]);

  for (const content_key of keys) {
    const draft_value = restoreDraft
      ? ((published[content_key] as LocalizedContentValue | undefined) ?? drafts[content_key] ?? {})
      : (drafts[content_key] ?? {});

    const { data: existing } = await supabase
      .from("website_content_strings")
      .select("id, version, versions, draft_value, published_value, status")
      .eq("content_key", content_key)
      .maybeSingle();

    const previousDraft =
      (existing?.draft_value as LocalizedContentValue | undefined) ?? null;
    const previousPublished =
      (existing?.published_value as LocalizedContentValue | undefined) ?? null;

    const published_value = publish
      ? draft_value
      : ((existing?.published_value as LocalizedContentValue | undefined) ??
        published[content_key] ??
        draft_value);

    const nextVersion = publish ? (existing?.version ?? 0) + 1 : (existing?.version ?? 1);

    const rowVersions = Array.isArray(existing?.versions)
      ? (existing.versions as ContentVersionSnapshot[])
      : [];

    const versions = publish
      ? [
          {
            id: globalThis.crypto.randomUUID(),
            label: `v${nextVersion}`,
            published: published_value,
            created_at: new Date().toISOString(),
          },
          ...rowVersions,
        ].slice(0, 30)
      : rowVersions;

    const nextStatus = publish
      ? "published"
      : unpublish
        ? "draft"
        : (existing?.status as "draft" | "published" | undefined) ?? "draft";

    const updatePayload: Record<string, unknown> = {
      draft_value,
      published_value,
      version: nextVersion,
      status: nextStatus,
      versions,
    };

    if (publish) {
      updatePayload.published_at = new Date().toISOString();
    } else if (unpublish) {
      updatePayload.published_at = null;
    }

    let rowId = existing?.id;

    if (existing?.id) {
      const { error } = await supabase
        .from("website_content_strings")
        .update(updatePayload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await supabase
        .from("website_content_strings")
        .insert({
          content_key,
          ...updatePayload,
          published_at: publish ? updatePayload.published_at : null,
          status: publish ? "published" : "draft",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      rowId = inserted.id;
    }

    if (!rowId) continue;

    const draftChanged =
      JSON.stringify(previousDraft) !== JSON.stringify(draft_value);
    const publishedChanged =
      publish &&
      JSON.stringify(previousPublished) !== JSON.stringify(published_value);

    if (draftChanged && !publish) {
      await insertKeyVersionHistory({
        content_string_id: rowId,
        content_key,
        version: nextVersion,
        previous_value: previousDraft,
        current_value: draft_value,
        change_type: restoreDraft ? "restore" : "draft",
      });
    }

    if (publishedChanged) {
      await insertKeyVersionHistory({
        content_string_id: rowId,
        content_key,
        version: nextVersion,
        previous_value: previousPublished,
        current_value: published_value,
        change_type: "publish",
      });
    }

    if (unpublish) {
      await insertKeyVersionHistory({
        content_string_id: rowId,
        content_key,
        version: nextVersion,
        previous_value: previousPublished,
        current_value: published_value,
        change_type: "unpublish",
      });
    }
  }
}

export async function upsertAdminContentStrings(
  payload: Pick<WebsiteContentStrings, "drafts" | "published" | "versions">,
  options?: {
    publish?: boolean;
    unpublish?: boolean;
    restoreDraft?: boolean;
  },
): Promise<WebsiteContentStrings> {
  if (isLocalDevCms()) {
    return saveLocalContentStrings(payload);
  }

  await upsertRows(payload.drafts, payload.published, options);

  if (options?.publish) {
    const supabase = await createCmsClient();
    await supabase.from("website_content_publish_snapshots").insert({
      label: `Published ${new Date().toLocaleString()}`,
      published: payload.drafts,
    });
  }

  return getAdminContentStrings();
}

export async function restoreContentKeyVersion(
  historyId: string,
): Promise<WebsiteContentStrings> {
  if (isLocalDevCms()) {
    return getLocalContentStrings();
  }

  const supabase = await createCmsClient();
  const { error } = await supabase.rpc("restore_content_version", {
    p_history_id: historyId,
  });
  if (error) throw new Error(error.message);
  return getAdminContentStrings();
}

export async function savePublishSnapshot(
  label: string,
  published: ContentStringStore,
): Promise<ContentVersionSnapshot[]> {
  if (isLocalDevCms()) {
    const current = await getLocalContentStrings();
    const snapshot: ContentVersionSnapshot = {
      id: crypto.randomUUID(),
      label,
      published,
      created_at: new Date().toISOString(),
    };
    const versions = [snapshot, ...current.versions].slice(0, 30);
    await saveLocalContentStrings({ versions });
    return versions;
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("website_content_publish_snapshots")
    .insert({ label, published })
    .select("id, label, published, created_at")
    .single();

  if (error) throw new Error(error.message);

  return fetchPublishSnapshots();
}

export { EMPTY_ROW };
