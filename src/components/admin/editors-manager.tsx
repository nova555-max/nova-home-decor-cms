"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  createEditor,
  deleteEditor,
  updateEditor,
} from "@/lib/actions/editors";
import { ADMIN_MODULES } from "@/types/admin";
import type { AdminPermissions, AdminUser } from "@/types/admin";
import { useAdminT } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EditorsManagerProps = {
  editors: AdminUser[];
};

function PermissionGrid({
  prefix,
  values,
  onChange,
  disabled,
}: {
  prefix: string;
  values: AdminPermissions;
  onChange?: (next: AdminPermissions) => void;
  disabled?: boolean;
}) {
  const t = useAdminT();

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ADMIN_MODULES.map((module) => (
        <label
          key={`${prefix}-${module}`}
          className="border-border/60 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <input
            type="checkbox"
            name={`perm_${module}`}
            defaultChecked={values[module]}
            disabled={disabled}
            onChange={
              onChange
                ? (e) => onChange({ ...values, [module]: e.target.checked })
                : undefined
            }
            className="size-4 rounded border"
          />
          <span>{t(`nav.${module}`)}</span>
        </label>
      ))}
    </div>
  );
}

export function EditorsManager({
  editors: initialEditors,
}: EditorsManagerProps) {
  const t = useAdminT();
  const router = useRouter();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [editors, setEditors] = useState(initialEditors);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  const editing = editors.find((e) => e.id === editingId) ?? null;

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await createEditor(formData);
        if (result.success) {
          toast.success(t("editors.created"));
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  const handleUpdate = (formData: FormData) => {
    startTransition(async () => {
      await runLocked(async () => {
        const result = await updateEditor(formData);
        if (result.success) {
          toast.success(t("editors.updated"));
          setEditingId(null);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("editors.confirm_delete"))) return;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteEditor(id);
        if (result.success) {
          toast.success(t("editors.deleted"));
          setEditors((items) => items.filter((item) => item.id !== id));
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {t("pages.editors.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("pages.editors.subtitle")}
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5" />
            {t("editors.add_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editor-email">{t("auth.email")}</Label>
                <Input
                  id="editor-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editor-password">{t("auth.password")}</Label>
                <Input
                  id="editor-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("editors.permissions")}</Label>
              <PermissionGrid
                prefix="create"
                values={
                  Object.fromEntries(
                    ADMIN_MODULES.map((m) => [m, false]),
                  ) as AdminPermissions
                }
              />
            </div>
            <Button type="submit" disabled={isPending} className="rounded-xl">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("editors.add_button")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{t("editors.list_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {editors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("editors.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auth.email")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("editors.permissions")}</TableHead>
                  <TableHead className="text-end">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editors.map((editor) => (
                  <TableRow key={editor.id}>
                    <TableCell>{editor.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={editor.is_active ? "default" : "secondary"}
                      >
                        {editor.is_active
                          ? t("common.active")
                          : t("common.hidden")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ADMIN_MODULES.filter((m) => editor.permissions[m]).map(
                          (module) => (
                            <Badge key={module} variant="outline">
                              {t(`nav.${module}`)}
                            </Badge>
                          ),
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setEditingId(editor.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(editor.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <Card className="rounded-2xl border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("editors.edit_title")}: {editing.email}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-password">
                    {t("editors.new_password")}
                  </Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    minLength={8}
                    placeholder={t("editors.password_optional")}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="is_active"
                      value="true"
                      defaultChecked={editing.is_active}
                    />
                    {t("common.active")}
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("editors.permissions")}</Label>
                <PermissionGrid
                  prefix={`edit-${editing.id}`}
                  values={editing.permissions}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("common.save")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
