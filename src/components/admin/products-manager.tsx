"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  deleteProduct,
  duplicateProduct,
  reorderProducts,
  saveProduct,
} from "@/lib/actions/cms";
import { slugify } from "@/lib/format";
import { emptyLocalized } from "@/lib/i18n";
import {
  categoryName,
  productName,
  type Category,
  type MediaAsset,
  type Product,
  type ProductStatus,
} from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { ProductSortableList } from "@/components/admin/product-sortable-list";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { useUnsavedWarning } from "@/hooks/use-unsaved-warning";
import { LocalizedInput } from "@/components/admin/locale-fields";
import { MultiImageUpload } from "@/components/admin/multi-image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ProductsManagerProps = {
  products: Product[];
  categories: Category[];
  mediaAssets?: MediaAsset[];
};

const emptyProduct = {
  name_i18n: emptyLocalized(),
  description_i18n: emptyLocalized(),
  slug: "",
  category_id: "",
  price: "",
  images: [] as string[],
  related_product_ids: [] as string[],
  sort_order: 0,
  status: "draft" as ProductStatus,
  is_featured: false,
  is_active: true,
  seo_title: "",
  seo_description: "",
  og_image: "",
};

export function ProductsManager({
  products,
  categories,
}: ProductsManagerProps) {
  const t = useAdminT();
  const router = useRouter();
  const { locale } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [list, setList] = useState(products);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  useUnsavedWarning(isDirty && open);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyProduct);
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name_i18n: {
        ku: product.name_i18n?.ku ?? product.name,
        ar: product.name_i18n?.ar ?? "",
        en: product.name_i18n?.en ?? "",
      },
      description_i18n: {
        ku: product.description_i18n?.ku ?? product.description ?? "",
        ar: product.description_i18n?.ar ?? "",
        en: product.description_i18n?.en ?? "",
      },
      slug: product.slug,
      category_id: product.category_id ?? "",
      price: product.price?.toString() ?? "",
      images: product.images?.length
        ? product.images
        : product.image_url
          ? [product.image_url]
          : [],
      sort_order: product.sort_order,
      status: product.status ?? "draft",
      is_featured: product.is_featured,
      is_active: product.is_active,
      related_product_ids: product.related_product_ids ?? [],
      seo_title: product.seo_title ?? "",
      seo_description: product.seo_description ?? "",
      og_image: product.og_image ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const displayName =
      form.name_i18n.ku || form.name_i18n.en || form.name_i18n.ar;
    if (!displayName.trim()) {
      toast.error(t("common.name"));
      return;
    }

    const formData = new FormData();
    if (editingId) formData.append("id", editingId);
    formData.append("name_i18n", JSON.stringify(form.name_i18n));
    formData.append("description_i18n", JSON.stringify(form.description_i18n));
    formData.append(
      "slug",
      form.slug ||
        slugify(form.name_i18n.ku || form.name_i18n.en || form.name_i18n.ar),
    );
    formData.append("category_id", form.category_id);
    formData.append("price", form.price);
    formData.append("images", JSON.stringify(form.images));
    formData.append(
      "related_product_ids",
      JSON.stringify(form.related_product_ids),
    );
    formData.append("status", form.status);
    formData.append("sort_order", String(form.sort_order));
    formData.append("is_featured", String(form.is_featured));
    formData.append("is_active", String(form.is_active));
    formData.append("seo_title", form.seo_title);
    formData.append("seo_description", form.seo_description);
    formData.append("og_image", form.og_image);

    startTransition(async () => {
      await runLocked(async () => {
        const result = await saveProduct(formData);
        if (result.success && result.data) {
          setList((prev) => {
            const index = prev.findIndex((item) => item.id === result.data!.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = {
                ...result.data!,
                category:
                  categories.find((c) => c.id === result.data!.category_id) ??
                  result.data!.category ??
                  null,
              };
              return next;
            }
            return [
              ...prev,
              {
                ...result.data!,
                category:
                  categories.find((c) => c.id === result.data!.category_id) ??
                  null,
              },
            ];
          });
          toast.success(t("common.saved"));
          setIsDirty(false);
          setOpen(false);
          setEditingId(null);
          setForm(emptyProduct);
          router.refresh();
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteProduct(deleteId);
        if (result.success) {
          setList((prev) => prev.filter((item) => item.id !== deleteId));
          toast.success(t("common.deleted"));
          setDeleteId(null);
        } else toast.error(result.error);
      });
    });
  };

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await duplicateProduct(id);
        if (result.success && result.data) {
          toast.success(t("common.saved"));
          const source = list.find((item) => item.id === id);
          if (source) {
            setList((prev) => [
              ...prev,
              {
                ...source,
                id: result.data!,
                name: `${source.name} (Copy)`,
                status: "draft",
                is_featured: false,
                is_active: false,
              },
            ]);
          }
        } else if (!result.success) toast.error(result.error);
      });
    });
  };

  const handleReorder = (ids: string[]) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await reorderProducts(ids);
        if (result.success) {
          setList((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            return ids
              .map((itemId, index) => {
                const item = map.get(itemId);
                return item ? { ...item, sort_order: index } : null;
              })
              .filter(Boolean) as Product[];
          });
          toast.success(t("common.order_updated"));
        } else toast.error(result.error);
      });
    });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        titleKey="pages.products.title"
        subtitleKey="pages.products.subtitle"
        action={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="size-4" />
            {t("products.add")}
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("products.edit") : t("products.new")}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            onChange={() => setIsDirty(true)}
            className="space-y-4"
          >
            <LocalizedInput
              label={t("common.name")}
              value={form.name_i18n}
              onChange={(name_i18n) =>
                setForm((prev) => ({ ...prev, name_i18n }))
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">{t("common.slug")}</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("products.category")}</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      category_id: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.select_category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {categoryName(category, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("products.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: (value ?? "draft") as ProductStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("products.draft")}</SelectItem>
                  <SelectItem value="published">
                    {t("products.published")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <LocalizedInput
              label={t("common.description")}
              multiline
              aiTask="product_description"
              aiContext={{
                entityType: "product",
                entityName:
                  form.name_i18n[locale] ||
                  form.name_i18n.ku ||
                  form.name_i18n.en,
                categoryName: categories.find((c) => c.id === form.category_id)
                  ? categoryName(
                      categories.find((c) => c.id === form.category_id)!,
                      locale,
                    )
                  : undefined,
              }}
              value={form.description_i18n}
              onChange={(description_i18n) =>
                setForm((prev) => ({ ...prev, description_i18n }))
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">{t("products.price")}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">{t("common.sort_order")}</Label>
                <Input
                  id="sort_order"
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
            </div>
            <MultiImageUpload
              value={form.images}
              onChange={(images) => setForm((prev) => ({ ...prev, images }))}
              folder="products"
            />
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">
                {t("seo.title")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="seo_title">{t("seo.title")}</Label>
                <Input
                  id="seo_title"
                  value={form.seo_title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      seo_title: e.target.value,
                    }))
                  }
                  placeholder={t("seo.title")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description">{t("seo.description")}</Label>
                <Input
                  id="seo_description"
                  value={form.seo_description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      seo_description: e.target.value,
                    }))
                  }
                  placeholder={t("seo.description")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og_image">{t("seo.og_image")}</Label>
                <Input
                  id="og_image"
                  value={form.og_image}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      og_image: e.target.value,
                    }))
                  }
                  placeholder="https://"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("products.related")}</Label>
              <div className="border-input max-h-36 space-y-2 overflow-y-auto rounded-md border p-3">
                {list
                  .filter((p) => p.id !== editingId)
                  .map((product) => (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.related_product_ids.includes(product.id)}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            related_product_ids: e.target.checked
                              ? [...prev.related_product_ids, product.id]
                              : prev.related_product_ids.filter(
                                  (id) => id !== product.id,
                                ),
                          }));
                        }}
                      />
                      {productName(product, locale)}
                    </label>
                  ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_featured: checked }))
                  }
                />
                <Label>{t("common.featured")}</Label>
              </div>
              <div className="flex items-center gap-2">
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

      <ProductSortableList
        products={list}
        onReorder={handleReorder}
        onEdit={openEdit}
        onDelete={setDeleteId}
        onDuplicate={handleDuplicate}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("common.confirm_delete")}
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
