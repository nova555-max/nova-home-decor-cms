"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { permanentDeleteItem, restoreItem } from "@/lib/actions/trash";
import type { TrashItem } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
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

type TrashManagerProps = {
  items: TrashItem[];
};

export function TrashManager({ items }: TrashManagerProps) {
  const t = useAdminT();
  const { direction } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [list, setList] = useState(() => (Array.isArray(items) ? items : []));
  const [isPending, startTransition] = useTransition();
  const [permanentId, setPermanentId] = useState<TrashItem | null>(null);

  const restore = (item: TrashItem) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await restoreItem(item.table, item.id);
        if (result.success) {
          toast.success(t("trash.restored"));
          setList((prev) =>
            prev.filter((i) => !(i.table === item.table && i.id === item.id)),
          );
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  const permanentDelete = () => {
    if (!permanentId) return;
    const target = permanentId;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await permanentDeleteItem(target.table, target.id);
        if (result.success) {
          toast.success(t("common.deleted"));
          setPermanentId(null);
          setList((prev) =>
            prev.filter(
              (i) => !(i.table === target.table && i.id === target.id),
            ),
          );
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  return (
    <div className="space-y-4" dir={direction}>
      <AdminPageHeader
        titleKey="pages.trash.title"
        subtitleKey="pages.trash.subtitle"
      />

      <div className="border-border/40 overflow-hidden rounded-2xl border shadow-sm" data-admin-table>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.title")}</TableHead>
              <TableHead>{t("trash.type")}</TableHead>
              <TableHead>{t("trash.deleted_at")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length ? (
              list.map((item) => (
                <TableRow key={`${item.table}-${item.id}`}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.table}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(item.deleted_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => restore(item)}
                        disabled={isPending}
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setPermanentId(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-12 text-center"
                >
                  {t("trash.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={!!permanentId}
        onOpenChange={(open) => !open && setPermanentId(null)}
        title={t("trash.permanent_title")}
        description={t("trash.permanent_desc")}
        confirmLabel={t("trash.permanent_confirm")}
        onConfirm={permanentDelete}
        loading={isPending}
      />
    </div>
  );
}
