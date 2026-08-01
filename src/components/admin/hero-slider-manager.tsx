"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  GripVertical,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteHeroSlide,
  reorderHeroSlides,
  saveHeroSlidesBatch,
  uploadAndCreateHeroSlide,
} from "@/lib/actions/hero-slides";
import { prepareImageForUpload } from "@/lib/image-utils";
import { useAdminT } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import {
  HERO_SLIDE_ACCEPT,
  HERO_SLIDE_ACCEPT_ATTR,
  HERO_SLIDE_MAX_BYTES,
  HERO_SLIDES_MAX,
  type HeroSlide,
} from "@/types/hero-slides";
import { HeroSlider } from "@/components/public/hero-slider";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

type HeroSliderManagerProps = {
  initial: HeroSlide[];
  /** Compact embed (e.g. settings page) */
  embedded?: boolean;
};

type DraftSlide = HeroSlide;

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "compressing" | "uploading" | "done" | "error";
  error?: string;
};

function toLocalDatetime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

function isAllowedHeroImage(file: File): boolean {
  const mime = (file.type || "").trim().toLowerCase();
  if (
    HERO_SLIDE_ACCEPT.includes(mime as (typeof HERO_SLIDE_ACCEPT)[number]) ||
    mime === "image/jpg"
  ) {
    return true;
  }
  // Safari/iOS often sends an empty MIME — trust the extension.
  if (!mime) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
  }
  return false;
}

/** iPhone photos may arrive as HEIC — we accept them only if we can convert. */
function canAttemptHeroConvert(file: File): boolean {
  if (isAllowedHeroImage(file)) return true;
  const mime = (file.type || "").trim().toLowerCase();
  if (mime === "image/heic" || mime === "image/heif" || mime.startsWith("image/")) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}

function formatUploadError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    const message = err.message.trim();
    // Next.js wraps oversized server-action bodies with this generic string.
    if (message.toLowerCase().includes("unexpected response")) {
      return "Upload failed: file may be too large for the server action. Try a smaller image (max 10MB).";
    }
    return message;
  }
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}

function SortableSlideCard({
  slide,
  onChange,
  onDelete,
  busy,
}: {
  slide: DraftSlide;
  onChange: (id: string, patch: Partial<DraftSlide>) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const t = useAdminT();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border/50 bg-card overflow-hidden rounded-2xl border shadow-sm",
        isDragging && "z-20 opacity-90 shadow-lg",
      )}
    >
      <div className="relative aspect-[16/10] bg-muted">
        <SmartImage
          src={slide.image_url}
          alt={slide.title || "Hero slide"}
          fit="cover"
          className="size-full"
        />
        <button
          type="button"
          className="bg-background/85 absolute start-2 top-2 z-10 flex size-8 items-center justify-center rounded-lg border shadow-sm"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="text-muted-foreground size-4" />
        </button>
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          className="absolute end-2 top-2 z-10 rounded-lg"
          disabled={busy}
          onClick={() => onDelete(slide.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
        <div className="absolute end-2 bottom-2">
          <Badge variant={slide.is_active ? "default" : "secondary"}>
            {slide.is_active ? t("hero_slider.active") : t("hero_slider.inactive")}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`active-${slide.id}`}>{t("hero_slider.enable")}</Label>
          <Switch
            id={`active-${slide.id}`}
            checked={slide.is_active}
            disabled={busy}
            onCheckedChange={(checked) =>
              onChange(slide.id, { is_active: checked })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`title-${slide.id}`}>{t("hero_slider.title")}</Label>
          <Input
            id={`title-${slide.id}`}
            value={slide.title ?? ""}
            disabled={busy}
            onChange={(e) => onChange(slide.id, { title: e.target.value })}
            placeholder={t("hero_slider.title_placeholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`subtitle-${slide.id}`}>
            {t("hero_slider.subtitle")}
          </Label>
          <Input
            id={`subtitle-${slide.id}`}
            value={slide.subtitle ?? ""}
            disabled={busy}
            onChange={(e) => onChange(slide.id, { subtitle: e.target.value })}
            placeholder={t("hero_slider.subtitle_placeholder")}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`btn-${slide.id}`}>
              {t("hero_slider.button_text")}
            </Label>
            <Input
              id={`btn-${slide.id}`}
              value={slide.button_text ?? ""}
              disabled={busy}
              onChange={(e) =>
                onChange(slide.id, { button_text: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`link-${slide.id}`}>
              {t("hero_slider.button_link")}
            </Label>
            <Input
              id={`link-${slide.id}`}
              value={slide.button_link ?? ""}
              disabled={busy}
              onChange={(e) =>
                onChange(slide.id, { button_link: e.target.value })
              }
              placeholder="/#products"
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`start-${slide.id}`}>
              {t("hero_slider.starts_at")}
            </Label>
            <Input
              id={`start-${slide.id}`}
              type="datetime-local"
              value={toLocalDatetime(slide.starts_at)}
              disabled={busy}
              onChange={(e) =>
                onChange(slide.id, {
                  starts_at: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`end-${slide.id}`}>{t("hero_slider.ends_at")}</Label>
            <Input
              id={`end-${slide.id}`}
              type="datetime-local"
              value={toLocalDatetime(slide.ends_at)}
              disabled={busy}
              onChange={(e) =>
                onChange(slide.id, {
                  ends_at: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSliderManager({
  initial,
  embedded = false,
}: HeroSliderManagerProps) {
  const t = useAdminT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [slides, setSlides] = useState<DraftSlide[]>(
    [...initial].sort((a, b) => a.display_order - b.display_order),
  );
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [draggingOver, setDraggingOver] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const busy = isPending || isLocked;

  useEffect(() => {
    setSlides([...initial].sort((a, b) => a.display_order - b.display_order));
  }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const previewSlides = useMemo(
    () => slides.filter((s) => s.is_active && s.image_url),
    [slides],
  );

  const patchSlide = useCallback((id: string, patch: Partial<DraftSlide>) => {
    setSlides((prev) =>
      prev.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)),
    );
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlides((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((slide, index) => ({
        ...slide,
        display_order: index,
      }));
    });
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const remaining = HERO_SLIDES_MAX - slides.length;
    if (remaining <= 0) {
      toast.error(t("hero_slider.max_reached"));
      return;
    }

    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.message(t("hero_slider.max_partial"));
    }

    for (const file of selected) {
      const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      if (!canAttemptHeroConvert(file)) {
        toast.error(t("hero_slider.invalid_type"));
        continue;
      }
      if (file.size > HERO_SLIDE_MAX_BYTES) {
        toast.error(t("hero_slider.too_large"));
        continue;
      }

      setUploads((prev) => [
        ...prev,
        {
          id: uploadId,
          name: file.name,
          progress: 5,
          status: "compressing",
        },
      ]);

      let progressTimer: ReturnType<typeof setInterval> | undefined;

      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, progress: 18, status: "compressing" }
              : u,
          ),
        );

        // Prefer compressed JPEG/WebP for Safari/iPhone HEIC/large photos.
        let prepared: File;
        try {
          prepared = await prepareImageForUpload(file);
        } catch {
          prepared = file;
        }

        // After compress, ensure we still have an allowed type (HEIC may fail).
        if (!isAllowedHeroImage(prepared)) {
          throw new Error(t("hero_slider.invalid_type"));
        }
        if (prepared.size > HERO_SLIDE_MAX_BYTES) {
          throw new Error(t("hero_slider.too_large"));
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, progress: 40, status: "uploading" }
              : u,
          ),
        );

        progressTimer = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId && u.status === "uploading" && u.progress < 85
                ? { ...u, progress: Math.min(85, u.progress + 4) }
                : u,
            ),
          );
        }, 280);

        const formData = new FormData();
        formData.append("file", prepared);

        const created = await uploadAndCreateHeroSlide(formData);
        if (!created.success) {
          throw new Error(created.error);
        }

        if (progressTimer) clearInterval(progressTimer);

        setSlides((prev) =>
          [...prev, created.data].map((slide, index) => ({
            ...slide,
            display_order: index,
          })),
        );
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100, status: "done" } : u,
          ),
        );
        toast.success(t("common.saved"));
      } catch (err) {
        if (progressTimer) clearInterval(progressTimer);
        const message = formatUploadError(err, t("hero_slider.upload_failed"));
        console.error("[hero-slider-upload]", message, err);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: "error", error: message, progress: 100 }
              : u,
          ),
        );
        toast.error(message);
      }
    }

    window.setTimeout(() => {
      setUploads((prev) =>
        prev.filter((u) => u.status === "compressing" || u.status === "uploading"),
      );
    }, 2200);
  };

  const removeSlide = (id: string) => {
    startTransition(async () => {
      const executed = await runLocked(async () => {
        const result = await deleteHeroSlide(id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setSlides((prev) =>
          prev
            .filter((s) => s.id !== id)
            .map((slide, index) => ({ ...slide, display_order: index })),
        );
        toast.success(t("common.deleted"));
      });
      void executed;
    });
  };

  const saveAll = () => {
    startTransition(async () => {
      await runLocked(async () => {
        const order = await reorderHeroSlides(slides.map((s) => s.id));
        if (!order.success) {
          toast.error(order.error);
          return;
        }
        const result = await saveHeroSlidesBatch(
          slides.map((slide, index) => ({
            id: slide.id,
            title: slide.title,
            subtitle: slide.subtitle,
            button_text: slide.button_text,
            button_link: slide.button_link,
            is_active: slide.is_active,
            starts_at: slide.starts_at,
            ends_at: slide.ends_at,
            display_order: index,
          })),
        );
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(t("common.saved"));
      });
    });
  };

  return (
    <div className={cn("space-y-6", embedded && "space-y-4")}>
      {!embedded ? (
        <AdminPageHeader
          titleKey="pages.hero_slider.title"
          subtitleKey="pages.hero_slider.subtitle"
        />
      ) : null}

      <div
        className={cn(
          !embedded &&
            "border-border/40 rounded-2xl border bg-card shadow-sm",
        )}
      >
        {!embedded ? (
          <div className="flex flex-col gap-3 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ImagePlus className="size-5 text-primary" />
                {t("hero_slider.manager_title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("hero_slider.manager_desc")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!previewSlides.length}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="size-4" />
                {t("hero_slider.preview")}
              </Button>
              <Button
                type="button"
                disabled={busy || !slides.length}
                onClick={saveAll}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <ImagePlus className="size-5 text-primary" />
                {t("hero_slider.manager_title")}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t("hero_slider.manager_desc")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!previewSlides.length}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="size-4" />
                {t("hero_slider.preview")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !slides.length}
                onClick={saveAll}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}

        <div className={cn("space-y-5", !embedded && "p-6")}>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDraggingOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingOver(true);
            }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingOver(false);
              if (e.dataTransfer.files?.length) {
                void uploadFiles(e.dataTransfer.files);
              }
            }}
            className={cn(
              "border-border flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition",
              draggingOver && "border-primary bg-primary/5",
              slides.length >= HERO_SLIDES_MAX && "pointer-events-none opacity-60",
            )}
          >
            <Upload className="text-muted-foreground size-6" />
            <p className="text-sm font-medium">{t("hero_slider.drop_title")}</p>
            <p className="text-muted-foreground text-xs">
              {t("hero_slider.drop_hint")}
            </p>
            <Badge variant="secondary">
              {slides.length}/{HERO_SLIDES_MAX}
            </Badge>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={HERO_SLIDE_ACCEPT_ATTR}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {uploads.length > 0 ? (
            <div className="space-y-2">
              {uploads.map((item) => (
                <div
                  key={item.id}
                  className="border-border/40 rounded-xl border px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.status === "compressing"
                        ? t("hero_slider.compressing")
                        : item.status === "uploading"
                          ? t("hero_slider.uploading")
                          : item.status === "done"
                            ? t("common.saved")
                            : item.error}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        item.status === "error" ? "bg-destructive" : "bg-primary",
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {slides.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("hero_slider.empty")}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={slides.map((s) => s.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {slides.map((slide) => (
                    <SortableSlideCard
                      key={slide.id}
                      slide={slide}
                      onChange={patchSlide}
                      onDelete={removeSlide}
                      busy={busy}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{t("hero_slider.preview")}</DialogTitle>
          </DialogHeader>
          <div className="border-t">
            <HeroSlider
              slides={previewSlides}
              aspectClassName="min-h-[55vh] md:min-h-[70vh]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
