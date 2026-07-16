"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteGalleryItem,
  saveGalleryBatch,
  saveGalleryItem,
} from "@/lib/actions/cms";
import { emptyLocalized } from "@/lib/i18n";
import type { GalleryItem } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { LocalizedInput } from "@/components/admin/locale-fields";
import { MultiImageUpload } from "@/components/admin/multi-image-upload";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GalleryManagerProps = {
  items: GalleryItem[];
};

const emptyItem = {
  title_i18n: emptyLocalized(),
  caption_i18n: emptyLocalized(),
  image_url: "",
  images: [] as string[],
  sort_order: 0,
  is_active: true,
};

export function GalleryManager({ items }: GalleryManagerProps) {
  const t = useAdminT();
  const router = useRouter();
  const { locale } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [list, setList] = useState(items);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyItem);
    setOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setForm({
      title_i18n: {
        ku: item.title_i18n?.ku ?? item.title ?? "",
        ar: item.title_i18n?.ar ?? "",
        en: item.title_i18n?.en ?? "",
      },
      caption_i18n: {
        ku: item.caption_i18n?.ku ?? item.caption ?? "",
        ar: item.caption_i18n?.ar ?? "",
        en: item.caption_i18n?.en ?? "",
      },
      image_url: item.image_url,
      images: [item.image_url],
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      await runLocked(async () => {
        if (editingId) {
          if (!form.image_url) {
            toast.error(t("common.image_required"));
            return;
          }
          const formData = new FormData();
          formData.append("id", editingId);
          formData.append("title_i18n", JSON.stringify(form.title_i18n));
          formData.append("caption_i18n", JSON.stringify(form.caption_i18n));
          formData.append("image_url", form.image_url);
          formData.append("sort_order", String(form.sort_order));
          formData.append("is_active", String(form.is_active));
          const result = await saveGalleryItem(formData);
          if (result.success && result.data) {
            setList((prev) => {
              const index = prev.findIndex((item) => item.id === result.data!.id);
              if (index >= 0) {
                const next = [...prev];
                next[index] = result.data!;
                return next;
              }
              return [...prev, result.data!];
            });
            toast.success(t("common.saved"));
            setOpen(false);
            setEditingId(null);
            setForm(emptyItem);
            router.refresh();
          } else if (!result.success) toast.error(result.error);
          return;
        }

        const images = form.images.length
          ? form.images
          : form.image_url
            ? [form.image_url]
            : [];
        if (!images.length) {
          toast.error(t("common.image_required"));
          return;
        }

        const formData = new FormData();
        formData.append("images", JSON.stringify(images));
        formData.append("title_i18n", JSON.stringify(form.title_i18n));
        formData.append("caption_i18n", JSON.stringify(form.caption_i18n));
        formData.append("sort_order", String(form.sort_order));
        formData.append("is_active", String(form.is_active));

        const result = await saveGalleryBatch(formData);
        if (result.success && result.data) {
          setList((prev) => [...prev, ...result.data!]);
          toast.success(t("common.saved"));
          setOpen(false);
          setEditingId(null);
          setForm(emptyItem);
          router.refresh();
        } else if (!result.success) toast.error(result.error);
      });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("common.confirm_delete"))) return;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteGalleryItem(id);
        if (result.success) {
          setList((prev) => prev.filter((item) => item.id !== id));
          toast.success(t("common.deleted"));
        } else toast.error(result.error);
      });
    });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        titleKey="pages.gallery.title"
        subtitleKey="pages.gallery.subtitle"
        action={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="size-4" />
            {t("gallery.add")}
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("gallery.edit") : t("gallery.new")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <LocalizedInput
              label={t("common.title")}
              value={form.title_i18n}
              onChange={(title_i18n) =>
                setForm((prev) => ({ ...prev, title_i18n }))
              }
            />
            {editingId ? (
              <ImageUpload
                value={form.image_url}
                onChange={(url) =>
                  setForm((prev) => ({ ...prev, image_url: url ?? "" }))
                }
                folder="gallery"
              />
            ) : (
              <>
                <MultiImageUpload
                  value={form.images}
                  onChange={(images) =>
                    setForm((prev) => ({ ...prev, images }))
                  }
                  folder="gallery"
                />
                <p className="text-muted-foreground text-xs">
                  {t("gallery.batch_hint")}
                </p>
              </>
            )}
            <LocalizedInput
              label={t("gallery.caption")}
              multiline
              aiTask="gallery_caption"
              aiContext={{
                entityType: "gallery",
                entityName:
                  form.title_i18n[locale] ||
                  form.title_i18n.ku ||
                  form.title_i18n.en,
              }}
              value={form.caption_i18n}
              onChange={(caption_i18n) =>
                setForm((prev) => ({ ...prev, caption_i18n }))
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("common.sort_order")}</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label>{t("common.active")}</Label>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-xl"
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isBusy
                ? t("common.saving")
                : editingId
                  ? t("common.save")
                  : t("common.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border-border/40 overflow-hidden rounded-2xl border shadow-sm" data-admin-table>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.title")}</TableHead>
              <TableHead>{t("gallery.caption")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-8 text-center"
                >
                  {t("common.no_items")}
                </TableCell>
              </TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.title || t("common.untitled")}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.caption ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? t("common.active") : t("common.hidden")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
