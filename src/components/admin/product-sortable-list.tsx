"use client";

import { memo, useEffect, useState } from "react";
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
import { Copy, GripVertical, Eye, Pencil, Trash2 } from "lucide-react";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/database";
import { useAdminT } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProductSortableListProps = {
  products: Product[];
  onReorder: (ids: string[]) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export const ProductSortableList = memo(function ProductSortableList({
  products,
  onReorder,
  onEdit,
  onDelete,
  onDuplicate,
}: ProductSortableListProps) {
  const t = useAdminT();
  const [mounted, setMounted] = useState(false);
  const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!sorted.length) {
    return (
      <div className="border-border/40 rounded-2xl border py-16 text-center shadow-sm">
        <p className="text-muted-foreground text-sm">{t("common.no_items")}</p>
      </div>
    );
  }

  if (!mounted) {
    return (
      <StaticProductTable
        products={sorted}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    );
  }

  return (
    <SortableProductTable
      products={sorted}
      onReorder={onReorder}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
  );
});

function SortableProductTable({
  products,
  onReorder,
  onEdit,
  onDelete,
  onDuplicate,
}: ProductSortableListProps & { products: Product[] }) {
  const t = useAdminT();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(products, oldIndex, newIndex).map((p) => p.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="border-border/40 overflow-hidden rounded-2xl border shadow-sm" data-admin-table>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("products.category")}</TableHead>
              <TableHead>{t("products.price")}</TableHead>
              <TableHead>{t("products.status")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={products.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {products.map((product) => (
                <SortableRow
                  key={product.id}
                  product={product}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
}

function SortableRow({
  product,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const t = useAdminT();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell data-label="">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex size-11 cursor-grab items-center justify-center rounded-lg"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium" data-label={t("common.name")}>
        {product.name}
      </TableCell>
      <TableCell data-label={t("products.category")}>
        {product.category?.name ?? "—"}
      </TableCell>
      <TableCell data-label={t("products.price")}>
        {formatPrice(product.price, product.price_currency) || "—"}
      </TableCell>
      <TableCell data-label={t("products.status")}>
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={product.status === "published" ? "default" : "secondary"}
          >
            {product.status === "published"
              ? t("products.published")
              : t("products.draft")}
          </Badge>
          {!product.is_active ? (
            <Badge variant="outline">{t("common.hidden")}</Badge>
          ) : null}
          {product.is_featured ? (
            <Badge variant="outline">{t("common.featured")}</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-end" data-label={t("common.actions")}>
        <ProductRowActions
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </TableCell>
    </TableRow>
  );
}

function StaticProductTable({
  products,
  onEdit,
  onDelete,
  onDuplicate,
}: Omit<ProductSortableListProps, "onReorder"> & { products: Product[] }) {
  const t = useAdminT();

  return (
    <div className="border-border/40 overflow-hidden rounded-2xl border shadow-sm" data-admin-table>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("products.category")}</TableHead>
            <TableHead>{t("products.price")}</TableHead>
            <TableHead>{t("products.status")}</TableHead>
            <TableHead className="text-end">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell data-label="">
                <span className="inline-block w-6" />
              </TableCell>
              <TableCell className="font-medium" data-label={t("common.name")}>
                {product.name}
              </TableCell>
              <TableCell data-label={t("products.category")}>
                {product.category?.name ?? "—"}
              </TableCell>
              <TableCell data-label={t("products.price")}>
                {formatPrice(product.price, product.price_currency) || "—"}
              </TableCell>
              <TableCell data-label={t("products.status")}>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant={
                      product.status === "published" ? "default" : "secondary"
                    }
                  >
                    {product.status === "published"
                      ? t("products.published")
                      : t("products.draft")}
                  </Badge>
                  {!product.is_active ? (
                    <Badge variant="outline">{t("common.hidden")}</Badge>
                  ) : null}
                  {product.is_featured ? (
                    <Badge variant="outline">{t("common.featured")}</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-end" data-label={t("common.actions")}>
                <ProductRowActions
                  product={product}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProductRowActions({
  product,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const t = useAdminT();

  return (
    <div className="flex justify-end gap-0.5">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        title={t("products.preview")}
        className="hover:bg-muted inline-flex size-11 items-center justify-center rounded-lg transition-colors md:size-8"
      >
        <Eye className="size-4" />
      </a>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => onDuplicate(product.id)}
      >
        <Copy className="size-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={() => onEdit(product)}>
        <Pencil className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => onDelete(product.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
