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
import { CornerDownLeft, GripVertical, Pencil, Trash2 } from "lucide-react";

import type { CategoryTreeNode } from "@/lib/categories/tree";
import { useAdminT, useDirection } from "@/hooks";
import { categoryName, type Category } from "@/types/database";
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
import { cn } from "@/lib/utils";

type CategorySortableListProps = {
  categories: CategoryTreeNode[];
  onReorder: (ids: string[]) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
};

export const CategorySortableList = memo(function CategorySortableList({
  categories,
  onReorder,
  onEdit,
  onDelete,
}: CategorySortableListProps) {
  const t = useAdminT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!categories.length) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        {t("categories.empty")}
      </p>
    );
  }

  if (!mounted) {
    return (
      <StaticCategoryTable
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <SortableCategoryTable
      categories={categories}
      onReorder={onReorder}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
});

function SortableCategoryTable({
  categories,
  onReorder,
  onEdit,
  onDelete,
}: CategorySortableListProps) {
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
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(categories, oldIndex, newIndex).map((c) => c.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead className="text-end">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {categories.map((category) => (
              <SortableRow
                key={category.id}
                category={category}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  );
}

function CategoryNameCell({ category }: { category: CategoryTreeNode }) {
  const t = useAdminT();
  const { locale } = useDirection();
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        category.depth > 0 && "ps-6 text-sm",
      )}
    >
      {category.depth > 0 ? (
        <CornerDownLeft className="text-muted-foreground size-3.5 shrink-0" />
      ) : null}
      <span className="font-medium">{categoryName(category, locale)}</span>
      {category.depth > 0 ? (
        <Badge variant="secondary" className="text-[10px]">
          {t("categories.subcategory")}
        </Badge>
      ) : null}
    </div>
  );
}

function SortableRow({
  category,
  onEdit,
  onDelete,
}: {
  category: CategoryTreeNode;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) {
  const t = useAdminT();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
          aria-label={t("common.drag_hint")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <CategoryNameCell category={category} />
      </TableCell>
      <TableCell>
        <Badge variant={category.is_active ? "default" : "secondary"}>
          {category.is_active ? t("common.active") : t("common.hidden")}
        </Badge>
      </TableCell>
      <TableCell className="text-end">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onEdit(category)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function StaticCategoryTable({
  categories,
  onEdit,
  onDelete,
}: {
  categories: CategoryTreeNode[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) {
  const t = useAdminT();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("common.name")}</TableHead>
          <TableHead>{t("common.status")}</TableHead>
          <TableHead className="text-end">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell>
              <CategoryNameCell category={category} />
            </TableCell>
            <TableCell>
              <Badge variant={category.is_active ? "default" : "secondary"}>
                {category.is_active ? t("common.active") : t("common.hidden")}
              </Badge>
            </TableCell>
            <TableCell className="text-end">
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onEdit(category)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onDelete(category.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
