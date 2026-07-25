"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { resolvePublicEnvWithDefaults } from "@/config/public-env-defaults";
import { getRootCategories } from "@/lib/categories/tree";
import { categoryName, type Category, type WebsiteSettings } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useAdminT, useDirection } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ShowroomQrManagerProps = {
  categories: Category[];
  settings: WebsiteSettings | null;
};

type QrItem = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

function siteBaseUrl() {
  const fromEnv = resolvePublicEnvWithDefaults().NEXT_PUBLIC_APP_URL.replace(
    /\/$/,
    "",
  );
  if (typeof window !== "undefined" && fromEnv.includes("localhost")) {
    return window.location.origin;
  }
  return fromEnv || "https://nova-home-decor.com";
}

export function ShowroomQrManager({
  categories,
  settings,
}: ShowroomQrManagerProps) {
  const t = useAdminT();
  const { locale } = useDirection();
  const roots = useMemo(() => getRootCategories(categories), [categories]);
  const companyName = settings?.company_name?.trim() || "Nova Home Decor";
  const baseUrl = siteBaseUrl();

  const [includeHome, setIncludeHome] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(roots.map((c) => c.id)),
  );
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const items = useMemo<QrItem[]>(() => {
    const list: QrItem[] = [];
    if (includeHome) {
      list.push({
        id: "home",
        title: companyName,
        subtitle: t("barcodes.home_label"),
        url: baseUrl,
      });
    }
    for (const category of roots) {
      if (!selected.has(category.id)) continue;
      list.push({
        id: category.id,
        title: categoryName(category, locale),
        subtitle: t("barcodes.category_label"),
        url: `${baseUrl}/?c=${encodeURIComponent(category.slug)}`,
      });
    }
    return list;
  }, [includeHome, roots, selected, companyName, baseUrl, locale, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const item of items) {
        next[item.id] = await QRCode.toDataURL(item.url, {
          width: 512,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#1f1c17", light: "#ffffff" },
        });
      }
      if (!cancelled) setQrImages(next);
    })().catch(() => {
      if (!cancelled) toast.error(t("barcodes.generate_failed"));
    });
    return () => {
      cancelled = true;
    };
  }, [items, t]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => {
    if (!items.length) {
      toast.error(t("barcodes.select_required"));
      return;
    }
    window.print();
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("barcodes.link_copied"));
    } catch {
      toast.error(t("barcodes.copy_failed"));
    }
  };

  return (
    <div className="space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  #showroom-qr-sheet, #showroom-qr-sheet * { visibility: visible !important; }
  #showroom-qr-sheet {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 190mm !important;
    min-height: auto !important;
    box-shadow: none !important;
    background: #faf8f3 !important;
  }
}
`,
        }}
      />

      <AdminPageHeader
        titleKey="pages.barcodes.title"
        subtitleKey="pages.barcodes.subtitle"
      />

      <div className="border-border/40 bg-card/50 space-y-4 rounded-2xl border p-4 print:hidden md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <QrCode className="size-4" />
              {t("barcodes.scan_title")}
            </h2>
            <p className="text-muted-foreground mt-1 max-w-xl text-xs">
              {t("barcodes.scan_hint")}
            </p>
            <p className="text-muted-foreground mt-2 font-mono text-[11px]">
              {baseUrl}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handlePrint}>
              <Printer className="size-4" />
              {t("barcodes.print_a4")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePrint}
            >
              <Download className="size-4" />
              {t("barcodes.download_pdf")}
            </Button>
          </div>
        </div>

        <div className="border-border/50 flex items-start gap-3 rounded-xl border bg-background/70 p-3">
          <Checkbox
            id="qr-home"
            checked={includeHome}
            onCheckedChange={() => setIncludeHome((v) => !v)}
            className="mt-1"
          />
          <div>
            <Label htmlFor="qr-home" className="cursor-pointer">
              {t("barcodes.include_home")}
            </Label>
            <p className="text-muted-foreground text-[11px]">
              {t("barcodes.include_home_hint")}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{t("barcodes.roots_title")}</p>
          {roots.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("categories.empty")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roots.map((category) => (
                <li
                  key={category.id}
                  className="border-border/50 flex items-start gap-3 rounded-xl border bg-background/70 p-3"
                >
                  <Checkbox
                    id={`qr-${category.id}`}
                    checked={selected.has(category.id)}
                    onCheckedChange={() => toggle(category.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`qr-${category.id}`}
                      className="cursor-pointer"
                    >
                      {categoryName(category, locale)}
                    </Label>
                    <p className="text-muted-foreground truncate font-mono text-[11px]">
                      {`/?c=${category.slug}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-border/40 overflow-x-auto rounded-2xl border bg-[#f4f1ea] p-4 print:border-0 print:bg-transparent print:p-0">
        <div
          id="showroom-qr-sheet"
          className="mx-auto w-[210mm] max-w-full bg-[#faf8f3] text-[#1f1c17] shadow-lg print:shadow-none"
          style={{ minHeight: "297mm" }}
        >
          <div className="relative overflow-hidden px-10 py-9">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(201,169,110,0.28), transparent 55%), linear-gradient(180deg, #faf8f3 0%, #f3eee4 100%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <header className="mb-8 border-b border-[#c9a96e]/45 pb-6 text-center">
                <p className="mb-2 text-[11px] font-semibold tracking-[0.35em] text-[#8a7040] uppercase">
                  {companyName}
                </p>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#2a241c]">
                  {t("barcodes.sheet_title")}
                </h1>
                <p className="mt-2 text-sm text-[#6b6258]">
                  {t("barcodes.sheet_subtitle")}
                </p>
              </header>

              {items.length === 0 ? (
                <p className="py-20 text-center text-sm text-[#6b6258] print:hidden">
                  {t("barcodes.select_required")}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[#d8c9a8] bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3">
                        <p className="text-[10px] tracking-[0.22em] text-[#8a7040] uppercase">
                          {item.subtitle}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[#2a241c]">
                          {item.title}
                        </h2>
                      </div>
                      <div className="flex justify-center rounded-xl border border-[#eee6d6] bg-[#fcfbf8] p-4">
                        {qrImages[item.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrImages[item.id]}
                            alt={item.title}
                            className="size-40"
                          />
                        ) : (
                          <div className="bg-muted size-40 animate-pulse rounded-lg" />
                        )}
                      </div>
                      <p className="mt-3 break-all text-center font-mono text-[10px] text-[#6b6258]">
                        {item.url}
                      </p>
                      <div className="mt-3 flex justify-center print:hidden">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(item.url)}
                        >
                          <Copy className="size-3.5" />
                          {t("barcodes.copy_link")}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <footer className="mt-10 flex items-center justify-between border-t border-[#c9a96e]/35 pt-4 text-[10px] tracking-[0.2em] text-[#8a7040] uppercase">
                <span>{companyName}</span>
                <span>A4 · QR Scan</span>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
