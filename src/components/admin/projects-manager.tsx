"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteProject, saveProject } from "@/lib/actions/cms";
import { createEntitySlug, formatDate } from "@/lib/format";
import { emptyLocalized } from "@/lib/i18n";
import type { Project } from "@/types/database";
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

type ProjectsManagerProps = {
  projects: Project[];
};

const emptyProject = {
  title_i18n: emptyLocalized(),
  description_i18n: emptyLocalized(),
  slug: "",
  client_name: "",
  location: "",
  cover_image: "",
  images: [] as string[],
  completed_at: "",
  sort_order: 0,
  is_featured: false,
  is_active: true,
};

export function ProjectsManager({ projects }: ProjectsManagerProps) {
  const t = useAdminT();
  const router = useRouter();
  const { direction, locale } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [list, setList] = useState(() =>
    Array.isArray(projects) ? projects : [],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyProject);
    setOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingId(project.id);
    setForm({
      title_i18n: {
        ku: project.title_i18n?.ku ?? project.title,
        ar: project.title_i18n?.ar ?? "",
        en: project.title_i18n?.en ?? "",
      },
      description_i18n: {
        ku: project.description_i18n?.ku ?? project.description ?? "",
        ar: project.description_i18n?.ar ?? "",
        en: project.description_i18n?.en ?? "",
      },
      slug: project.slug,
      client_name: project.client_name ?? "",
      location: project.location ?? "",
      cover_image: project.cover_image ?? "",
      images: project.images?.length ? project.images : [],
      completed_at: project.completed_at ?? "",
      sort_order: project.sort_order,
      is_featured: project.is_featured,
      is_active: project.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const title =
      form.title_i18n.ku || form.title_i18n.en || form.title_i18n.ar;
    if (!title.trim()) {
      toast.error(t("common.title"));
      return;
    }

    const formData = new FormData();
    if (editingId) formData.append("id", editingId);
    formData.append("title_i18n", JSON.stringify(form.title_i18n));
    formData.append("description_i18n", JSON.stringify(form.description_i18n));
    formData.append(
      "slug",
      form.slug ||
        createEntitySlug(
          form.title_i18n.ku || form.title_i18n.en || form.title_i18n.ar,
          "project",
        ),
    );
    formData.append("client_name", form.client_name);
    formData.append("location", form.location);
    formData.append("cover_image", form.cover_image);
    formData.append("images", JSON.stringify(form.images));
    formData.append("completed_at", form.completed_at);
    formData.append("sort_order", String(form.sort_order));
    formData.append("is_featured", String(form.is_featured));
    formData.append("is_active", String(form.is_active));

    startTransition(async () => {
      await runLocked(async () => {
        const result = await saveProject(formData);
        if (result.success && result.data) {
          toast.success(t("common.saved"));
          setList((prev) => {
            const idx = prev.findIndex((p) => p.id === result.data!.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = result.data!;
              return next;
            }
            return [...prev, result.data!];
          });
          setOpen(false);
          setEditingId(null);
          setForm(emptyProject);
          router.refresh();
        } else if (!result.success) {
          toast.error(result.error);
        }
      });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("common.confirm_delete"))) return;
    startTransition(async () => {
      await runLocked(async () => {
        const result = await deleteProject(id);
        if (result.success) {
          toast.success(t("common.deleted"));
          setList((prev) => prev.filter((p) => p.id !== id));
        } else {
          toast.error(result.error);
        }
      });
    });
  };

  return (
    <div className="space-y-4" dir={direction}>
      <AdminPageHeader
        titleKey="pages.projects.title"
        subtitleKey="pages.projects.subtitle"
        action={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="size-4" />
            {t("projects.add")}
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir={direction}
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("projects.edit") : t("projects.new")}
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
            <LocalizedInput
              label={t("common.description")}
              multiline
              aiTask="project_description"
              aiContext={{
                entityType: "project",
                entityName:
                  form.title_i18n[locale] ||
                  form.title_i18n.ku ||
                  form.title_i18n.en,
                location: form.location,
                clientName: form.client_name,
              }}
              value={form.description_i18n}
              onChange={(description_i18n) =>
                setForm((prev) => ({ ...prev, description_i18n }))
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("projects.client")}</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      client_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("projects.location")}</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>
            </div>
            <ImageUpload
              value={form.cover_image}
              onChange={(url) =>
                setForm((prev) => ({ ...prev, cover_image: url ?? "" }))
              }
              folder="projects"
              label={t("common.cover_image")}
            />
            <MultiImageUpload
              value={form.images}
              onChange={(images) => setForm((prev) => ({ ...prev, images }))}
              folder="projects"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("projects.completed")}</Label>
                <Input
                  type="date"
                  value={form.completed_at}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      completed_at: e.target.value,
                    }))
                  }
                />
              </div>
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
              {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
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
              <TableHead>{t("projects.location")}</TableHead>
              <TableHead>{t("projects.completed_col")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-8 text-center"
                >
                  {t("common.no_items")}
                </TableCell>
              </TableRow>
            ) : (
              list.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>{project.location ?? "—"}</TableCell>
                  <TableCell>{formatDate(project.completed_at)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={project.is_active ? "default" : "secondary"}
                    >
                      {project.is_active
                        ? t("common.active")
                        : t("common.hidden")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(project)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(project.id)}
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
