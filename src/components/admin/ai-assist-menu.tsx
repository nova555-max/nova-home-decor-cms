"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/config/site";
import { siteConfig } from "@/config/site";
import type { AiAdminTask, AiGenerateContext } from "@/lib/ai/types";
import { useAdminT } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AiAssistMenuProps = {
  task: AiAdminTask;
  locale: Locale;
  multiline?: boolean;
  context?: AiGenerateContext;
  onApply: (value: Record<Locale, string>) => void;
  onApplyText?: (text: string) => void;
  className?: string;
};

async function callGenerate(body: object) {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    error?: string;
    localized?: Partial<Record<Locale, string>>;
    text?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "AI request failed");
  }
  return data;
}

export function AiAssistMenu({
  task,
  locale,
  multiline,
  context,
  onApply,
  onApplyText,
  className,
}: AiAssistMenuProps) {
  const t = useAdminT();
  const [loading, setLoading] = useState(false);

  const run = async (selectedTask: AiAdminTask, extra?: object) => {
    setLoading(true);
    const toastId = toast.loading(t("ai.generating"));
    try {
      const data = await callGenerate({
        task: selectedTask,
        locale,
        sourceLocale: locale,
        multiline,
        context,
        ...extra,
      });

      if (data.text && onApplyText) {
        onApplyText(data.text);
      } else if (data.localized) {
        const merged = siteConfig.locales.reduce(
          (acc, loc) => {
            acc[loc] = data.localized?.[loc] ?? "";
            return acc;
          },
          {} as Record<Locale, string>,
        );
        onApply(merged);
      } else if (data.text) {
        onApply({
          ...siteConfig.locales.reduce(
            (a, l) => ({ ...a, [l]: "" }),
            {} as Record<Locale, string>,
          ),
          [locale]: data.text,
        });
      }

      toast.success(t("ai.done"), { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("ai.error"),
        { id: toastId },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            className={className}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5 text-[var(--gold)]" />
            )}
            {t("ai.assist")}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem onClick={() => run(task)}>
          {t("ai.generate")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            run("translate", {
              sourceLocale: locale,
              targetLocales: siteConfig.locales.filter((l) => l !== locale),
            })
          }
        >
          {t("ai.translate_all")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("improve_grammar")}>
          {t("ai.improve")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("marketing_rewrite")}>
          {t("ai.marketing_rewrite")}
        </DropdownMenuItem>
        {multiline ? (
          <>
            <DropdownMenuItem onClick={() => run("premium_rewrite")}>
              {t("ai.premium_rewrite")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run("short_version")}>
              {t("ai.short_version")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run("long_version")}>
              {t("ai.long_version")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
