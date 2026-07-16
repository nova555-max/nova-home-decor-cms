"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  Lock,
  LockOpen,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import {
  duplicateHomepageSection,
  resetHomepageSection,
  scheduleHomepageSection,
  toggleSectionLock,
  updateSectionManager,
} from "@/lib/actions/section-visibility";
import {
  getRegistryEntry,
  HOMEPAGE_SECTION_REGISTRY,
} from "@/lib/homepage/section-registry";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import type { HomepageSectionSetting, SectionManagerState } from "@/types/homepage-sections";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SectionVisibilityManagerProps = {
  initial: SectionManagerState;
  isSuperAdmin: boolean;
};

function toLocalDatetime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SectionVisibilityManager({
  initial,
  isSuperAdmin,
}: SectionVisibilityManagerProps) {
  const t = useAdminT();
  const { direction } = useDirection();
  const [sections, setSections] = useState(
    [...initial.sections].sort((a, b) => a.order - b.order),
  );
  const [previewSection, setPreviewSection] = useState<HomepageSectionSetting | null>(null);
  const [scheduleSection, setScheduleSection] = useState<HomepageSectionSetting | null>(null);
  const [publishAt, setPublishAt] = useState("");
  const [unpublishAt, setUnpublishAt] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const isBusy = isPending || isLocked;

  useEffect(() => setMounted(true), []);

  const registryMap = useMemo(
    () => new Map(HOMEPAGE_SECTION_REGISTRY.map((entry) => [entry.id, entry])),
    [],
  );

  const saveSections = (
    next: HomepageSectionSetting[],
    options?: { silent?: boolean },
  ) => {
    const ordered = next.map((section, index) => ({ ...section, order: index }));
    setSections(ordered);
    startTransition(async () => {
      await runLocked(async () => {
        const result = await updateSectionManager(ordered);
        if (result.success) {
          if (!options?.silent) {
            toast.success(t("common.saved"));
          }
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleToggleLock = (sectionId: string) => {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;

    const nextLocked = !section.locked;

    if (section.locked && !nextLocked && !isSuperAdmin) {
      toast.error(t("section_visibility.unlock_denied"));
      return;
    }

    const previous = sections;
    const next = sections.map((item) =>
      item.id === sectionId ? { ...item, locked: nextLocked } : item,
    );
    const ordered = next.map((section, index) => ({ ...section, order: index }));
    setSections(ordered);

    void runLocked(async () => {
      try {
        const result = await toggleSectionLock(sectionId, nextLocked);
        if (result.success && result.data?.section_manager) {
          setSections(
            [...result.data.section_manager.sections].sort(
              (a, b) => a.order - b.order,
            ),
          );
          toast.success(
            nextLocked
              ? t("section_visibility.locked_success")
              : t("section_visibility.unlocked_success"),
          );
          return;
        }

        setSections(previous);
        if (!result.success) {
          toast.error(result.error);
        } else {
          toast.error(t("section_visibility.lock_failed"));
        }
        if (process.env.NODE_ENV === "development") {
          console.error("[section-visibility:lock]", result);
        }
      } catch (error) {
        setSections(previous);
        const message =
          error instanceof Error ? error.message : t("section_visibility.lock_failed");
        toast.error(message);
        if (process.env.NODE_ENV === "development") {
          console.error("[section-visibility:lock]", error);
        }
      }
    });
  };

  const updateSection = (
    id: string,
    patch: Partial<HomepageSectionSetting>,
  ) => {
    const next = sections.map((section) =>
      section.id === id ? { ...section, ...patch } : section,
    );
    saveSections(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    if (sections[oldIndex]?.locked || sections[newIndex]?.locked) return;
    saveSections(arrayMove(sections, oldIndex, newIndex));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDuplicate = (sectionId: string) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await duplicateHomepageSection(sectionId);
        if (result.success && result.data?.section_manager) {
          setSections(
            [...result.data.section_manager.sections].sort(
              (a, b) => a.order - b.order,
            ),
          );
          toast.success(t("section_visibility.duplicated"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleReset = (sectionId: string) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await resetHomepageSection(sectionId);
        if (result.success && result.data?.section_manager) {
          setSections(
            [...result.data.section_manager.sections].sort(
              (a, b) => a.order - b.order,
            ),
          );
          toast.success(t("section_visibility.reset_done"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const openSchedule = (section: HomepageSectionSetting) => {
    setScheduleSection(section);
    setPublishAt(toLocalDatetime(section.scheduled_publish_at));
    setUnpublishAt(toLocalDatetime(section.scheduled_unpublish_at));
  };

  const saveSchedule = () => {
    if (!scheduleSection) return;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await scheduleHomepageSection(
          scheduleSection.id,
          publishAt ? new Date(publishAt).toISOString() : null,
          unpublishAt ? new Date(unpublishAt).toISOString() : null,
        );
        if (result.success && result.data?.section_manager) {
          setSections(
            [...result.data.section_manager.sections].sort(
              (a, b) => a.order - b.order,
            ),
          );
          setScheduleSection(null);
          toast.success(t("section_visibility.schedule_saved"));
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const list = (
    <div className="space-y-3">
      {sections.map((section) => (
        <StaticSectionRow
          key={section.id}
          section={section}
          registry={registryMap.get(section.id) ?? getRegistryEntry(section.type)}
          disabled={isBusy}
          isSuperAdmin={isSuperAdmin}
          onUpdate={updateSection}
          onToggleLock={handleToggleLock}
          onPreview={setPreviewSection}
          onDuplicate={handleDuplicate}
          onReset={handleReset}
          onSchedule={openSchedule}
          t={t}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6" dir={direction}>
      <AdminPageHeader
        titleKey="pages.section_visibility.title"
        subtitleKey="pages.section_visibility.subtitle"
        action={
          <Button className="rounded-xl" disabled={isBusy} render={<Link href="/" />}>
            {t("section_visibility.view_live")}
          </Button>
        }
      />

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("section_visibility.title")}</CardTitle>
          <CardDescription>{t("section_visibility.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!mounted ? (
            list
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((section) => section.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sections.map((section) => (
                    <SortableSectionRow
                      key={section.id}
                      section={section}
                      registry={
                        registryMap.get(section.id) ??
                        getRegistryEntry(section.type)
                      }
                      disabled={isBusy}
                      isSuperAdmin={isSuperAdmin}
                      onUpdate={updateSection}
                      onToggleLock={handleToggleLock}
                      onPreview={setPreviewSection}
                      onDuplicate={handleDuplicate}
                      onReset={handleReset}
                      onSchedule={openSchedule}
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewSection} onOpenChange={() => setPreviewSection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("section_visibility.preview")}</DialogTitle>
          </DialogHeader>
          {previewSection ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">
                {t(
                  registryMap.get(previewSection.id)?.labelKey ??
                    `section_visibility.sections.${previewSection.type}`,
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={previewSection.visible ? "default" : "secondary"}>
                  {previewSection.visible
                    ? t("section_visibility.visible")
                    : t("section_visibility.hidden")}
                </Badge>
                <Badge variant={previewSection.enabled ? "default" : "secondary"}>
                  {previewSection.enabled
                    ? t("section_visibility.enabled")
                    : t("section_visibility.disabled")}
                </Badge>
                {previewSection.locked ? (
                  <Badge variant="outline">{t("section_visibility.locked")}</Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground">{t("section_visibility.preview_hint")}</p>
              <Button className="rounded-xl" render={<Link href="/" target="_blank" />}>
                <Eye className="size-4" />
                {t("section_visibility.open_public")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduleSection} onOpenChange={() => setScheduleSection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("section_visibility.schedule")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("section_visibility.publish_at")}</Label>
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("section_visibility.unpublish_at")}</Label>
              <Input
                type="datetime-local"
                value={unpublishAt}
                onChange={(e) => setUnpublishAt(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button className="w-full rounded-xl" disabled={isBusy} onClick={saveSchedule}>
              {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t("section_visibility.save_schedule")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type RowProps = {
  section: HomepageSectionSetting;
  registry?: { labelKey: string; editHref?: string };
  disabled: boolean;
  isSuperAdmin: boolean;
  onUpdate: (id: string, patch: Partial<HomepageSectionSetting>) => void;
  onToggleLock: (id: string) => void;
  onPreview: (section: HomepageSectionSetting) => void;
  onDuplicate: (id: string) => void;
  onReset: (id: string) => void;
  onSchedule: (section: HomepageSectionSetting) => void;
  t: ReturnType<typeof useAdminT>;
};

function SectionRowContent({
  section,
  registry,
  disabled,
  locked,
  dragHandle,
  onUpdate,
  onToggleLock,
  onPreview,
  onDuplicate,
  onReset,
  onSchedule,
  t,
}: RowProps & { locked: boolean; dragHandle?: React.ReactNode }) {
  const labelKey =
    registry?.labelKey ?? `section_visibility.sections.${section.type}`;
  const editingDisabled = disabled || locked;

  return (
    <div
      className={cn(
        "border-border/40 flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between",
        !section.enabled && "opacity-60",
        section.is_custom && "border-dashed",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {dragHandle}
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{t(labelKey)}</p>
          <p className="text-muted-foreground text-xs">
            {section.id}
            {section.duplicated_from
              ? ` · ${t("section_visibility.duplicated_from")} ${section.duplicated_from}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant={section.visible ? "default" : "secondary"}>
              {section.visible ? t("section_visibility.visible") : t("section_visibility.hidden")}
            </Badge>
            {!section.enabled ? (
              <Badge variant="secondary">{t("section_visibility.disabled")}</Badge>
            ) : null}
            {section.locked ? (
              <Badge variant="outline">{t("section_visibility.locked")}</Badge>
            ) : null}
            {section.scheduled_publish_at ? (
              <Badge variant="outline">
                <CalendarClock className="me-1 size-3" />
                {t("section_visibility.scheduled")}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs">{t("section_visibility.show")}</Label>
          <Switch
            checked={section.visible}
            disabled={editingDisabled}
            onCheckedChange={(visible) => onUpdate(section.id, { visible })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">{t("section_visibility.enable")}</Label>
          <Switch
            checked={section.enabled}
            disabled={editingDisabled}
            onCheckedChange={(enabled) => onUpdate(section.id, { enabled })}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            aria-pressed={section.locked}
            aria-label={
              section.locked
                ? t("section_visibility.unlock_section")
                : t("section_visibility.lock_section")
            }
            onClick={() => onToggleLock(section.id)}
          >
            {section.locked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={disabled}
            onClick={() => onPreview(section)}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={editingDisabled}
            onClick={() => onSchedule(section)}
          >
            <CalendarClock className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={editingDisabled}
            onClick={() => onDuplicate(section.id)}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={editingDisabled || section.is_custom}
            onClick={() => onReset(section.id)}
          >
            <RotateCcw className="size-4" />
          </Button>
          {registry?.editHref ? (
            editingDisabled ? (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                disabled
              >
                {t("common.edit")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                render={<Link href={registry.editHref} />}
              >
                {t("common.edit")}
              </Button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortableSectionRow(props: RowProps) {
  const { section, t } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, disabled: section.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionRowContent
        {...props}
        locked={section.locked}
        dragHandle={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-1 cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
            aria-label={t("common.drag_handle")}
            disabled={section.locked}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

function StaticSectionRow(props: RowProps) {
  return <SectionRowContent {...props} locked={props.section.locked} />;
}
