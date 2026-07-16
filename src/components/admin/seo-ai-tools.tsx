"use client";

import { useState } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { SeoSocialResult } from "@/lib/ai/types";
import { useAdminT } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SeoAiToolsProps = {
  companyName?: string;
  onApplyTitle: (value: string) => void;
  onApplyDescription: (value: string) => void;
  currentTitle?: string;
  currentDescription?: string;
};

async function generateSeo(body: object) {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "AI failed");
  return data as {
    localized?: Partial<Record<string, string>>;
    text?: string;
    social?: SeoSocialResult;
  };
}

export function SeoAiTools({
  companyName,
  onApplyTitle,
  onApplyDescription,
  currentTitle,
  currentDescription,
}: SeoAiToolsProps) {
  const t = useAdminT();
  const [keywords, setKeywords] = useState("");
  const [social, setSocial] = useState<SeoSocialResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const ctx = {
    entityType: "seo" as const,
    companyName,
    existingText: [currentTitle, currentDescription].filter(Boolean).join("\n"),
  };

  const run = async (
    task: "seo_title" | "seo_description" | "seo_keywords" | "seo_social",
    key: string,
  ) => {
    setLoading(key);
    try {
      const data = await generateSeo({ task, locale: "ku", context: ctx });
      if (task === "seo_keywords") {
        setKeywords(data.text ?? "");
        toast.success(t("ai.done"));
        return;
      }
      if (task === "seo_social") {
        setSocial(data.social ?? null);
        toast.success(t("ai.done"));
        return;
      }
      const text = data.localized?.ku ?? data.text ?? "";
      if (task === "seo_title") onApplyTitle(text);
      else onApplyDescription(text);
      toast.success(t("ai.done"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ai.error"));
    } finally {
      setLoading(null);
    }
  };

  const copyJson = (value: unknown) => {
    void navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    toast.success(t("ai.copied"));
  };

  return (
    <Card className="border-border/40 rounded-[20px] shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-[var(--gold)]" />
          {t("ai.seo_tools")}
        </CardTitle>
        <CardDescription>{t("ai.seo_tools_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[12px]"
            disabled={!!loading}
            onClick={() => run("seo_title", "title")}
          >
            {loading === "title" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {t("ai.seo_title")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[12px]"
            disabled={!!loading}
            onClick={() => run("seo_description", "desc")}
          >
            {loading === "desc" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {t("ai.seo_description")}
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            className="rounded-[12px]"
            disabled={!!loading}
            onClick={() => run("seo_keywords", "kw")}
          >
            {loading === "kw" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {t("ai.seo_keywords")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[12px]"
            disabled={!!loading}
            onClick={() => run("seo_social", "social")}
          >
            {loading === "social" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {t("ai.seo_social")}
          </Button>
        </div>

        {keywords ? (
          <div className="border-border bg-muted/40 rounded-[12px] border p-3 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                {t("ai.keywords_result")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(keywords);
                  toast.success(t("ai.copied"));
                }}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            {keywords}
          </div>
        ) : null}

        {social ? (
          <div className="border-border bg-muted/40 space-y-3 rounded-[12px] border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                {t("ai.social_result")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => copyJson(social)}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            {social.og_title ? (
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                  Open Graph
                </p>
                <p className="text-xs">
                  {social.og_title.ku ?? social.og_title.en}
                </p>
                {social.og_description ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {social.og_description.ku ?? social.og_description.en}
                  </p>
                ) : null}
              </div>
            ) : null}
            {social.twitter_title ? (
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                  Twitter Card
                </p>
                <p className="text-xs">
                  {social.twitter_title.ku ?? social.twitter_title.en}
                </p>
              </div>
            ) : null}
            {social.structured_data ? (
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                  JSON-LD
                </p>
                <pre className="bg-background max-h-32 overflow-auto rounded-[8px] p-2 text-[10px]">
                  {JSON.stringify(social.structured_data, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
