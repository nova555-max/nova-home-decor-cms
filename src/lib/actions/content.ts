"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { countDraftChanges } from "@/lib/content/registry";
import { actionErrorMessage } from "@/lib/actions/action-utils";
import type { ActionResult } from "@/lib/actions/action-types";
import { logActionError } from "@/lib/actions/action-helpers";
import {
  getAdminContentStrings,
  restoreContentKeyVersion,
  upsertAdminContentStrings,
} from "@/lib/queries/content";
import { requirePermission } from "@/lib/supabase/auth";
import { PROTECTED_CONTENT_KEYS } from "@/types/content";
import type {
  ContentStringStore,
  ContentVersionSnapshot,
  WebsiteContentStrings,
} from "@/types/content";

const MAX_VERSIONS = 30;

function stripProtected(store: ContentStringStore): ContentStringStore {
  const next: ContentStringStore = {};
  for (const [key, value] of Object.entries(store)) {
    if (PROTECTED_CONTENT_KEYS.has(key)) continue;
    next[key] = value;
  }
  return next;
}

export async function getContentManagementData(): Promise<WebsiteContentStrings> {
  await requirePermission("content");
  return getAdminContentStrings();
}

export async function saveContentDrafts(
  drafts: ContentStringStore,
): Promise<ActionResult<WebsiteContentStrings>> {
  await requirePermission("content");

  try {
    const current = await getAdminContentStrings();
    const next = await upsertAdminContentStrings(
      {
        drafts: stripProtected(drafts),
        published: current.published,
        versions: current.versions,
      },
    );
    return { success: true, data: next };
  } catch (error) {
    logActionError("save-content-draft", error);
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Could not save draft",
      ),
    };
  }
}

export async function publishContentStrings(
  drafts?: ContentStringStore,
): Promise<ActionResult<WebsiteContentStrings>> {
  await requirePermission("content");

  try {
    const current = await getAdminContentStrings();
    const nextDrafts = stripProtected(drafts ?? current.drafts);
    const snapshot: ContentVersionSnapshot = {
      id: crypto.randomUUID(),
      label: `Published ${new Date().toLocaleString()}`,
      published: current.published,
      created_at: new Date().toISOString(),
    };

    const versions = [snapshot, ...current.versions].slice(0, MAX_VERSIONS);

    const next = await upsertAdminContentStrings(
      {
        drafts: nextDrafts,
        published: nextDrafts,
        versions,
      },
      { publish: true },
    );

    revalidateTag(CACHE_TAGS.content);
    revalidateTag(CACHE_TAGS.homepage);

    return { success: true, data: next };
  } catch (error) {
    logActionError("publish-content", error);
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Could not publish",
      ),
    };
  }
}

export async function unpublishContentStrings(): Promise<ActionResult<WebsiteContentStrings>> {
  await requirePermission("content");

  try {
    const current = await getAdminContentStrings();
    const next = await upsertAdminContentStrings(
      {
        drafts: current.drafts,
        published: current.published,
        versions: current.versions,
      },
      { unpublish: true },
    );

    revalidateTag(CACHE_TAGS.content);
    revalidateTag(CACHE_TAGS.homepage);

    return { success: true, data: next };
  } catch (error) {
    logActionError("unpublish-content", error);
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Could not unpublish",
      ),
    };
  }
}

export async function restoreContentDraft(): Promise<ActionResult<WebsiteContentStrings>> {
  await requirePermission("content");

  try {
    const current = await getAdminContentStrings();
    const next = await upsertAdminContentStrings(
      {
        drafts: current.published,
        published: current.published,
        versions: current.versions,
      },
      { restoreDraft: true },
    );

    revalidateTag(CACHE_TAGS.content);

    return { success: true, data: next };
  } catch (error) {
    logActionError("restore-content-draft", error);
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Could not restore draft",
      ),
    };
  }
}

export async function restoreContentKeyVersionAction(
  historyId: string,
): Promise<ActionResult<WebsiteContentStrings>> {
  await requirePermission("content");

  try {
    const next = await restoreContentKeyVersion(historyId);
    revalidateTag(CACHE_TAGS.content);
    return { success: true, data: next };
  } catch (error) {
    logActionError("restore-content-key-version", error);
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Could not restore version",
      ),
    };
  }
}

export async function restoreContentVersion(
  versionId: string,
): Promise<ActionResult<WebsiteContentStrings>> {
  await requirePermission("content");

  try {
    const current = await getAdminContentStrings();
    const version = current.versions.find((v) => v.id === versionId);
    if (!version) {
      return { success: false, error: "Version not found." };
    }

    const restored = stripProtected(version.published);
    const snapshot: ContentVersionSnapshot = {
      id: crypto.randomUUID(),
      label: `Restored ${version.label}`,
      published: current.published,
      created_at: new Date().toISOString(),
    };

    const next = await upsertAdminContentStrings(
      {
        drafts: restored,
        published: restored,
        versions: [snapshot, ...current.versions].slice(0, MAX_VERSIONS),
      },
      { publish: true },
    );

    revalidateTag(CACHE_TAGS.content);
    revalidateTag(CACHE_TAGS.homepage);

    return { success: true, data: next };
  } catch (error) {
    logActionError("restore-content-version", error);
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Could not restore version",
      ),
    };
  }
}

export async function getContentDraftStatus(
  drafts: ContentStringStore,
  published: ContentStringStore,
): Promise<{ pendingChanges: number }> {
  return { pendingChanges: countDraftChanges(drafts, published) };
}
