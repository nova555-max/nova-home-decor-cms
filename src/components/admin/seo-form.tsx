"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateSeoSettings } from "@/lib/actions/cms";
import type { WebsiteSettings } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { SeoAiTools } from "@/components/admin/seo-ai-tools";
import { useAdminT, useDirection } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SeoFormProps = {
  settings: WebsiteSettings | null;
};

export function SeoForm({ settings }: SeoFormProps) {
  const t = useAdminT();
  const router = useRouter();
  const { direction } = useDirection();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [form, setForm] = useState({
    seo_title: settings?.seo_title ?? "",
    seo_description: settings?.seo_description ?? "",
    og_image: settings?.og_image ?? "",
  });
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  useEffect(() => {
    setForm({
      seo_title: settings?.seo_title ?? "",
      seo_description: settings?.seo_description ?? "",
      og_image: settings?.og_image ?? "",
    });
  }, [settings]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (process.env.NODE_ENV === "development") {
      console.info("[settings:form] seo-submit");
    }
    const formData = new FormData();
    formData.append("seo_title", form.seo_title);
    formData.append("seo_description", form.seo_description);
    formData.append("og_image", form.og_image);

    startTransition(async () => {
      await runLocked(async () => {
        const result = await updateSeoSettings(formData);
        if (result.success) {
          if (result.data) {
            setForm({
              seo_title: result.data.seo_title ?? "",
              seo_description: result.data.seo_description ?? "",
              og_image: result.data.og_image ?? "",
            });
          }
          toast.success(t("common.saved"));
          router.refresh();
        } else {
          toast.error(result.error);
          if (process.env.NODE_ENV === "development") {
            console.error("[settings:form] seo-error", result.error);
          }
        }
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={direction}>
      <AdminPageHeader
        titleKey="pages.seo.title"
        subtitleKey="pages.seo.subtitle"
      />

      <SeoAiTools
        companyName={settings?.company_name}
        currentTitle={form.seo_title}
        currentDescription={form.seo_description}
        onApplyTitle={(seo_title) => setForm((p) => ({ ...p, seo_title }))}
        onApplyDescription={(seo_description) =>
          setForm((p) => ({ ...p, seo_description }))
        }
      />

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("seo.global")}</CardTitle>
          <CardDescription>{t("seo.global_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("seo.title")}</Label>
            <Input
              value={form.seo_title}
              onChange={(e) =>
                setForm((p) => ({ ...p, seo_title: e.target.value }))
              }
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("seo.description")}</Label>
            <Textarea
              rows={4}
              value={form.seo_description}
              onChange={(e) =>
                setForm((p) => ({ ...p, seo_description: e.target.value }))
              }
              className="rounded-xl"
            />
          </div>
          <ImageUpload
            value={form.og_image}
            onChange={(url) => setForm((p) => ({ ...p, og_image: url ?? "" }))}
            folder="seo"
            label={t("seo.og_image")}
          />
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("seo.sitemap")}</CardTitle>
          <CardDescription>{t("seo.sitemap_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="bg-muted rounded-xl px-3 py-2 text-sm">
            /sitemap.xml
          </code>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isBusy}
        size="lg"
        className="rounded-xl"
      >
        {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
        {isBusy ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
