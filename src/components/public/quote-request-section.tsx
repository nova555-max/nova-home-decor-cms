"use client";

import { useRef, useState } from "react";
import { ImagePlus, Send } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import { showroomText } from "@/lib/showroom/content";
import type { HomepageContent, WebsiteSettings } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { LuxuryButton } from "@/components/public/showroom/luxury-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuoteRequestSectionProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  locale: Locale;
};

const projectTypeKeys = [
  "doors",
  "windows",
  "kitchen",
  "lighting",
  "marble",
  "interior",
] as const;

export function QuoteRequestSection({
  settings,
  homepage,
  locale,
}: QuoteRequestSectionProps) {
  const quote = homepage?.quote?.[locale] ?? homepage?.quote?.ku;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [projectType, setProjectType] = useState<string>(projectTypeKeys[0]);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const waLink = whatsappLink(settings?.whatsapp_number);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waLink) return;

    const typeLabel = t(locale, "quote", `types.${projectType}`);
    const message = [
      t(locale, "quote", "wa_intro"),
      "",
      `${t(locale, "quote", "name")}: ${name}`,
      `${t(locale, "quote", "phone")}: ${phone}`,
      `${t(locale, "quote", "project_type")}: ${typeLabel}`,
      fileName ? `${t(locale, "quote", "attachment")}: ${fileName}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `${waLink}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section id="quote" className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={showroomText(quote?.eyebrow, t(locale, "quote", "eyebrow"))}
          title={showroomText(quote?.title, t(locale, "quote", "title"))}
          subtitle={showroomText(quote?.subtitle, t(locale, "quote", "subtitle"))}
        />

        <motion.form
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          onSubmit={handleSubmit}
          className="showroom-card mx-auto max-w-2xl space-y-6 border border-border bg-card p-8 md:p-10"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="quote-name" className="text-sm font-medium">
                {t(locale, "quote", "name")}
              </label>
              <Input
                id="quote-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-[14px]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="quote-phone" className="text-sm font-medium">
                {t(locale, "quote", "phone")}
              </label>
              <Input
                id="quote-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="rounded-[14px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="quote-type" className="text-sm font-medium">
              {t(locale, "quote", "project_type")}
            </label>
            <select
              id="quote-type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="h-9 w-full rounded-[14px] border border-input bg-card px-3 text-sm shadow-soft outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {projectTypeKeys.map((type) => (
                <option key={type} value={type}>
                  {t(locale, "quote", `types.${type}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">
              {t(locale, "quote", "upload")}
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed border-border bg-muted/30 px-6 py-10 transition hover:border-[var(--gold)] hover:bg-muted/50",
              )}
            >
              <ImagePlus className="size-8 text-[var(--gold)]" />
              <span className="text-sm text-muted-foreground">
                {fileName ?? t(locale, "quote", "upload_hint")}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <LuxuryButton
            type="submit"
            disabled={!waLink}
            className="w-full gap-2 py-6"
          >
            <Send className="size-4" />
            {t(locale, "quote", "submit")}
          </LuxuryButton>
        </motion.form>
      </div>
    </section>
  );
}
