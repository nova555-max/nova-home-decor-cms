"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { deleteCategory, saveCategory } from "@/lib/actions/cms";
import { reorderCategories } from "@/lib/actions/homepage";
import {
  flattenCategoryTree,
  wouldCreateCategoryCycle,
} from "@/lib/categories/tree";
import { createEntitySlug } from "@/lib/format";
import { emptyLocalized, type LocalizedText } from "@/lib/i18n";
import { categoryName, type Category } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategorySortableList } from "@/components/admin/category-sortable-list";
import { ImageUpload } from "@/components/admin/image-upload";
import { LocalizedInput } from "@/components/admin/locale-fields";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CategoriesManagerProps = {
  categories: Category[];
};

const NO_PARENT = "__none__";

function primaryName(value: LocalizedText) {
  return (value.ku || value.en || value.ar || "").trim();
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const t = useAdminT();
  const { locale } = useDirection();
  const router = useRouter();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [list, setList] = useState(() =>
    Array.isArray(categories) ? categories : [],
  );
  const [nameI18n, setNameI18n] = useState(emptyLocalized);
  const [parentId, setParentId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editNameI18n, setEditNameI18n] = useState(emptyLocalized);
  const [editDescriptionI18n, setEditDescriptionI18n] = useState(emptyLocalized);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  const tree = useMemo(() => flattenCategoryTree(list), [list]);
  const rootParents = useMemo(
    () => list.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [list],
  );

  const submitCategory = (
    name_i18n: LocalizedText,
    description_i18n: LocalizedText,
    nextParentId: string | null,
    id?: string | null,
    existing?: Category,
    imageUrl?: string | null,
  ) => {
    const displayName = primaryName(name_i18n);
    if (!displayName) {
      toast.error(t("categories.name_required"));
      return;
    }

    if (wouldCreateCategoryCycle(list, id, nextParentId)) {
      toast.error(t("categories.parent_invalid"));
      return;
    }

    if (nextParentId) {
      const parent = list.find((c) => c.id === nextParentId);
      if (parent?.parent_id) {
        toast.error(t("categories.parent_depth"));
        return;
      }
    }

    const formData = new FormData();
    if (id) formData.append("id", id);
    formData.append("name_i18n", JSON.stringify(name_i18n));
    formData.append("description_i18n", JSON.stringify(description_i18n));
    formData.append(
      "slug",
      existing?.slug || createEntitySlug(displayName, "category"),
    );
    formData.append(
      "sort_order",
      String(existing?.sort_order ?? list.length),
    );
    formData.append("is_active", String(existing?.is_active ?? true));
    if (imageUrl) formData.append("image_url", imageUrl);
    if (nextParentId) formData.append("parent_id", nextParentId);

    startTransition(async () => {
      await runLocked(async () => {
        const result = await saveCategory(formData);
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
          if (!id) {
            setNameI18n(emptyLocalized());
            setParentId(null);
          }
          setEditOpen(false);
          setEditingId(null);
          router.refresh();
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setEditNameI18n({
      ku: category.name_i18n?.ku ?? category.name,
      ar: category.name_i18n?.ar ?? "",
      en: category.name_i18n?.en ?? "",
    });
    setEditDescriptionI18n({
      ku: category.description_i18n?.ku ?? category.description ?? "",
      ar: category.description_i18n?.ar ?? "",
      en: category.description_i18n?.en ?? "",
    });
    setEditImageUrl(category.image_url ?? "");
    setEditParentId(category.parent_id);
    setEditOpen(true);
  };

  const handleReorder = (orderedIds: string[]) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await reorderCategories(orderedIds);
        if (result.success) {
          setList((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            return orderedIds
              .map((id, index) => {
                const item = map.get(id);
                return item ? { ...item, sort_order: index } : null;
              })
              .filter(Boolean) as Category[];
          });
          toast.success(t("common.order_updated"));
        } else toast.error(result.error);
      });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("common.confirm_delete"))) return;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteCategory(id);
        if (result.success) {
          setList((prev) =>
            prev
              .filter((item) => item.id !== id)
              .map((item) =>
                item.parent_id === id ? { ...item, parent_id: null } : item,
              ),
          );
          toast.success(t("common.deleted"));
        } else toast.error(result.error);
      });
    });
  };

  const parentOptionsForEdit = rootParents.filter((c) => c.id !== editingId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titleKey="pages.categories.title"
        subtitleKey="pages.categories.subtitle"
      />

      <form
        className="border-border/40 bg-card/50 space-y-3 rounded-2xl border p-4 md:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submitCategory(nameI18n, emptyLocalized(), parentId);
        }}
      >
        <Label>{t("categories.add")}</Label>
        <LocalizedInput
          label={t("common.name")}
          value={nameI18n}
          onChange={setNameI18n}
        />
        <div className="space-y-2">
          <Label>{t("categories.parent")}</Label>
          <Select
            value={parentId ?? NO_PARENT}
            onValueChange={(value) =>
              setParentId(!value || value === NO_PARENT ? null : value)
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder={t("categories.parent_none")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>
                {t("categories.parent_none")}
              </SelectItem>
              {rootParents.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {categoryName(category, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {t("categories.parent_hint")}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          {t("categories.name_hint")}
        </p>
        <Button
          type="submit"
          disabled={isBusy || !primaryName(nameI18n)}
          className="rounded-xl"
        >
          {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {isBusy ? t("common.saving") : t("common.create")}
        </Button>
      </form>

      <div className="border-border/40 overflow-hidden rounded-2xl border shadow-sm" data-admin-table>
        <CategorySortableList
          categories={tree}
          onReorder={handleReorder}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("categories.edit")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const existing = list.find((c) => c.id === editingId);
              submitCategory(
                editNameI18n,
                editDescriptionI18n,
                editParentId,
                editingId,
                existing,
                editImageUrl || null,
              );
            }}
          >
            <LocalizedInput
              label={t("common.name")}
              value={editNameI18n}
              onChange={setEditNameI18n}
            />
            <div className="space-y-2">
              <Label>{t("categories.parent")}</Label>
              <Select
                value={editParentId ?? NO_PARENT}
                onValueChange={(value) =>
                  setEditParentId(!value || value === NO_PARENT ? null : value)
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("categories.parent_none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>
                    {t("categories.parent_none")}
                  </SelectItem>
                  {parentOptionsForEdit.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {categoryName(category, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LocalizedInput
              label={t("common.description")}
              value={editDescriptionI18n}
              onChange={setEditDescriptionI18n}
              multiline
            />
            <ImageUpload
              value={editImageUrl}
              onChange={(url) => setEditImageUrl(url ?? "")}
              folder="categories"
              label={t("common.image")}
            />
            <Button
              type="submit"
              disabled={isBusy || !primaryName(editNameI18n)}
              className="w-full rounded-xl"
            >
              {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {isBusy ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
