"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Clock3,
  Eye,
  History,
  Loader2,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Send,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
  publishContentStrings,
  restoreContentDraft,
  restoreContentKeyVersionAction,
  restoreContentVersion,
  saveContentDrafts,
  unpublishContentStrings,
} from "@/lib/actions/content";
import {
  CONTENT_REGISTRY,
  countDraftChanges,
  filterRegistry,
} from "@/lib/content/registry";
import { stripHtml } from "@/lib/i18n/cms-text";
import { t as dictT } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/config/site";
import {
  CONTENT_ADMIN_SECTIONS,
  type ContentAdminSection,
  type ContentStringStore,
  type WebsiteContentStrings,
} from "@/types/content";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LocaleTabs } from "@/components/admin/locale-fields";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useAdminT, useDirection } from "@/hooks";
import { useContentUndoRedo } from "@/hooks/use-content-undo";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ContentManagementViewProps = {
  initial: WebsiteContentStrings;
};

const AUTO_SAVE_MS = 2500;

export function ContentManagementView({ initial }: ContentManagementViewProps) {
  const t = useAdminT();
  const { direction } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });

  const [data, setData] = useState(initial);
  const {
    value: drafts,
    setValue: setDrafts,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetDrafts,
  } = useContentUndoRedo(initial.drafts);
  const [locale, setLocale] = useState<Locale>("ku");
  const [section, setSection] = useState<ContentAdminSection | "all">("all");
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState(CONTENT_REGISTRY[0]?.key ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [autoSaveState, setAutoSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isPending, startTransition] = useTransition();
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftsRef = useRef(drafts);
  const isBusy = isPending || isLocked;

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  const entries = useMemo(
    () => filterRegistry({ section, query }),
    [section, query],
  );

  const activeEntry = useMemo(
    () => entries.find((e) => e.key === activeKey) ?? entries[0],
    [entries, activeKey],
  );

  useEffect(() => {
    if (activeEntry && activeEntry.key !== activeKey) {
      setActiveKey(activeEntry.key);
    }
  }, [activeEntry, activeKey]);

  const pendingChanges = useMemo(
    () => countDraftChanges(drafts, data.published),
    [drafts, data.published],
  );

  const scheduleAutoSave = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      startTransition(async () => {
        setAutoSaveState("saving");
        const result = await saveContentDrafts(draftsRef.current);
        if (result.success && result.data) {
          setData((prev) => ({ ...prev, drafts: result.data!.drafts }));
          resetDrafts(result.data!.drafts);
          setAutoSaveState("saved");
        } else {
          setAutoSaveState("error");
          if (!result.success) toast.error(result.error);
        }
      });
    }, AUTO_SAVE_MS);
  }, [startTransition]);

  const updateValue = (key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [locale]: value,
      },
    }));
    setAutoSaveState("idle");
    scheduleAutoSave();
  };

  const handlePublish = () => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await publishContentStrings(draftsRef.current);
        if (result.success && result.data) {
          setData(result.data);
          resetDrafts(result.data.drafts);
          toast.success(t("content.published"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await unpublishContentStrings();
        if (result.success && result.data) {
          setData(result.data);
          toast.success(t("content.unpublished"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleRestoreDraft = () => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await restoreContentDraft();
        if (result.success && result.data) {
          setData(result.data);
          resetDrafts(result.data.drafts);
          toast.success(t("content.draft_restored"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleRestoreKeyVersion = (historyId: string) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await restoreContentKeyVersionAction(historyId);
        if (result.success && result.data) {
          setData(result.data);
          resetDrafts(result.data.drafts);
          setHistoryOpen(false);
          toast.success(t("content.restored"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const compareEntries = useMemo(
    () =>
      (data.keyHistory ?? []).filter((entry) => compareIds.includes(entry.id)),
    [compareIds, data.keyHistory],
  );

  const toggleCompareSelection = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  };

  const handleRestore = (versionId: string) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await restoreContentVersion(versionId);
        if (result.success && result.data) {
          setData(result.data);
          resetDrafts(result.data.drafts);
          setHistoryOpen(false);
          toast.success(t("content.restored"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const activeValue = activeEntry
    ? (drafts[activeEntry.key]?.[locale] ?? "")
    : "";

  const previewText = activeEntry
    ? activeEntry.fieldType === "rich"
      ? stripHtml(activeValue) || dictT(locale, activeEntry.dictSection as never, activeEntry.dictKey)
      : activeValue ||
        dictT(locale, activeEntry.dictSection as never, activeEntry.dictKey)
    : "";

  const localeDir = locale === "en" ? "ltr" : "rtl";

  return (
    <div className="space-y-4" dir={direction}>
      <AdminPageHeader
        titleKey="pages.content.title"
        subtitleKey="pages.content.subtitle"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={pendingChanges ? "default" : "secondary"}>
              {pendingChanges
                ? `${pendingChanges} ${t("content.draft_changes")}`
                : t("content.in_sync")}
            </Badge>
            {autoSaveState === "saving" ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Loader2 className="size-3 animate-spin" />
                {t("content.auto_saving")}
              </span>
            ) : null}
            {autoSaveState === "saved" ? (
              <span className="text-muted-foreground text-xs">
                {t("content.auto_saved")}
              </span>
            ) : null}
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isBusy}
              onClick={() => undo()}
              title={t("content.undo")}
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isBusy}
              onClick={() => redo()}
              title={t("content.redo")}
            >
              <Redo2 className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isBusy || !pendingChanges}
              onClick={handleRestoreDraft}
            >
              <RotateCcw className="size-4" />
              {t("content.restore_draft")}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isBusy}
              onClick={handleUnpublish}
            >
              {t("content.unpublish")}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isBusy}
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
              {t("content.history")}
            </Button>
            <Button
              className="rounded-xl"
              disabled={isBusy}
              onClick={handlePublish}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("content.publish")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs activeLocale={locale} onChange={setLocale} />
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("content.search")}
            className="rounded-xl ps-9"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="border-border/40 space-y-2 rounded-2xl border p-3">
          <Button
            type="button"
            variant={section === "all" ? "default" : "ghost"}
            className="w-full justify-start rounded-xl"
            onClick={() => setSection("all")}
          >
            {t("content.all_sections")}
          </Button>
          {CONTENT_ADMIN_SECTIONS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={section === item.id ? "default" : "ghost"}
              className="w-full justify-start rounded-xl text-start"
              onClick={() => setSection(item.id)}
            >
              {t(item.labelKey)}
            </Button>
          ))}
        </aside>

        <section className="border-border/40 grid gap-4 rounded-2xl border p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-2 overflow-y-auto lg:max-h-[68vh]">
            {entries.map((entry) => {
              const draftVal = drafts[entry.key]?.[locale] ?? "";
              const pubVal = data.published[entry.key]?.[locale] ?? "";
              const changed = draftVal !== pubVal;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setActiveKey(entry.key)}
                  className={cn(
                    "hover:bg-muted/50 w-full rounded-xl border px-3 py-2 text-start transition-colors",
                    activeKey === entry.key && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{entry.label}</span>
                    {changed ? (
                      <Badge variant="outline" className="rounded-lg text-[10px]">
                        {t("content.draft")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {entry.key}
                  </p>
                </button>
              );
            })}
            {!entries.length ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {t("content.no_results")}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            {activeEntry ? (
              <>
                <div>
                  <Label className="text-base font-semibold">
                    {activeEntry.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">{activeEntry.key}</p>
                </div>

                {activeEntry.fieldType === "rich" ? (
                  <RichTextEditor
                    value={activeValue}
                    onChange={(html) => updateValue(activeEntry.key, html)}
                    placeholder={dictT(
                      locale,
                      activeEntry.dictSection as never,
                      activeEntry.dictKey,
                    )}
                    dir={localeDir}
                    disabled={isBusy}
                  />
                ) : (
                  <Textarea
                    rows={5}
                    value={activeValue}
                    onChange={(e) => updateValue(activeEntry.key, e.target.value)}
                    placeholder={dictT(
                      locale,
                      activeEntry.dictSection as never,
                      activeEntry.dictKey,
                    )}
                    dir={localeDir}
                    disabled={isBusy}
                    className="rounded-xl"
                  />
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={isBusy}
                  onClick={() => {
                    const fallback = dictT(
                      locale,
                      activeEntry.dictSection as never,
                      activeEntry.dictKey,
                    );
                    updateValue(activeEntry.key, fallback);
                  }}
                >
                  <RotateCcw className="size-4" />
                  {t("content.reset_default")}
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <aside className="border-border/40 space-y-3 rounded-2xl border p-4">
          <div className="flex items-center gap-2">
            <Eye className="text-primary size-4" />
            <h3 className="font-semibold">{t("content.live_preview")}</h3>
          </div>
          <div
            className="bg-muted/30 min-h-[200px] rounded-xl border p-4 text-sm leading-relaxed"
            dir={localeDir}
          >
            {activeEntry?.fieldType === "rich" ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    activeValue ||
                    `<p>${dictT(locale, activeEntry.dictSection as never, activeEntry.dictKey)}</p>`,
                }}
              />
            ) : (
              <p>{previewText || "—"}</p>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{t("content.preview_hint")}</p>
        </aside>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("content.history")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold">{t("content.publish_history")}</h4>
              <div className="space-y-2">
                {data.versions.length ? (
                  data.versions.map((version) => (
                    <div
                      key={version.id}
                      className="border-border/40 flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{version.label}</p>
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock3 className="size-3" />
                          {new Date(version.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={isBusy}
                        onClick={() => handleRestore(version.id)}
                      >
                        <Save className="size-4" />
                        {t("content.restore")}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    {t("content.no_history")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">{t("content.key_history")}</h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  disabled={compareIds.length !== 2}
                  onClick={() => setCompareOpen(true)}
                >
                  {t("content.compare_versions")}
                </Button>
              </div>
              <div className="space-y-2">
                {data.keyHistory?.length ? (
                  data.keyHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "border-border/40 flex items-center justify-between gap-3 rounded-xl border p-3",
                        compareIds.includes(entry.id) && "border-primary bg-primary/5",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {entry.content_key} · v{entry.version}
                          {entry.previous_version != null
                            ? ` (from v${entry.previous_version})`
                            : ""}{" "}
                          · {entry.change_type}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock3 className="size-3" />
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={compareIds.includes(entry.id) ? "default" : "outline"}
                          className="rounded-xl"
                          disabled={isBusy}
                          onClick={() => toggleCompareSelection(entry.id)}
                        >
                          {t("content.compare")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={isBusy}
                          onClick={() => handleRestoreKeyVersion(entry.id)}
                        >
                          <Save className="size-4" />
                          {t("content.restore")}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    {t("content.no_key_history")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("content.compare_versions")}</DialogTitle>
          </DialogHeader>
          {compareEntries.length === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {compareEntries.map((entry) => (
                <div key={entry.id} className="space-y-2 rounded-xl border p-3">
                  <p className="text-sm font-medium">
                    {entry.content_key} · v{entry.version}
                  </p>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {t("content.previous_version")}
                    </p>
                    <pre className="bg-muted/40 max-h-48 overflow-auto rounded-lg p-2 text-xs">
                      {JSON.stringify(entry.previous_value ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {t("content.current_version")}
                    </p>
                    <pre className="bg-muted/40 max-h-48 overflow-auto rounded-lg p-2 text-xs">
                      {JSON.stringify(entry.current_value ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("content.select_two_versions")}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
