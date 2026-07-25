"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";

import {
  categoryBarcodeValue,
  getRootCategories,
} from "@/lib/categories/tree";
import { categoryName, type Category, type WebsiteSettings } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useAdminT, useDirection } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CategoryBarcodesManagerProps = {
  categories: Category[];
  settings: WebsiteSettings | null;
};

export function CategoryBarcodesManager({
  categories,
  settings,
}: CategoryBarcodesManagerProps) {
  const t = useAdminT();
  const { locale } = useDirection();
  const roots = useMemo(() => getRootCategories(categories), [categories]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(roots.map((c) => c.id)),
  );

  const selectedCategories = useMemo(
    () => roots.filter((c) => selected.has(c.id)),
    [roots, selected],
  );

  const companyName = settings?.company_name?.trim() || "Nova Home Decor";

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(roots.map((c) => c.id)));
  const clearAll = () => setSelected(new Set());

  const handlePrint = () => {
    if (!selectedCategories.length) {
      toast.error(t("barcodes.select_required"));
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  #barcode-a4-sheet, #barcode-a4-sheet * { visibility: visible !important; }
  #barcode-a4-sheet {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">{t("barcodes.roots_title")}</h2>
            <p className="text-muted-foreground text-xs">
              {t("barcodes.roots_hint")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              {t("barcodes.select_all")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              {t("barcodes.clear")}
            </Button>
            <Button type="button" size="sm" onClick={handlePrint}>
              <Printer className="size-4" />
              {t("barcodes.print_a4")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
              <Download className="size-4" />
              {t("barcodes.download_pdf")}
            </Button>
          </div>
        </div>

        {roots.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("categories.empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((category) => {
              const checked = selected.has(category.id);
              const code = categoryBarcodeValue(category);
              return (
                <li
                  key={category.id}
                  className="border-border/50 flex items-start gap-3 rounded-xl border bg-background/70 p-3"
                >
                  <Checkbox
                    id={`bc-${category.id}`}
                    checked={checked}
                    onCheckedChange={() => toggle(category.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={`bc-${category.id}`} className="cursor-pointer">
                      {categoryName(category, locale)}
                    </Label>
                    <p className="text-muted-foreground font-mono text-[11px] tracking-wide">
                      {code}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-border/40 overflow-x-auto rounded-2xl border bg-[#f4f1ea] p-4 print:border-0 print:bg-transparent print:p-0">
        <A4BarcodeSheet
          companyName={companyName}
          categories={selectedCategories}
          locale={locale}
          sheetTitle={t("barcodes.sheet_title")}
          sheetSubtitle={t("barcodes.sheet_subtitle")}
          emptyLabel={t("barcodes.select_required")}
        />
      </div>
    </div>
  );
}

function A4BarcodeSheet({
  companyName,
  categories,
  locale,
  sheetTitle,
  sheetSubtitle,
  emptyLabel,
}: {
  companyName: string;
  categories: Category[];
  locale: string;
  sheetTitle: string;
  sheetSubtitle: string;
  emptyLabel: string;
}) {
  return (
    <div
      id="barcode-a4-sheet"
      className="mx-auto w-[210mm] max-w-full bg-[#faf8f3] text-[#1f1c17] shadow-lg print:shadow-none"
      style={{ minHeight: "297mm" }}
    >
      <div className="relative overflow-hidden px-10 py-9 print:px-12 print:py-10">
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
              {sheetTitle}
            </h1>
            <p className="mt-2 text-sm text-[#6b6258]">{sheetSubtitle}</p>
          </header>

          {categories.length === 0 ? (
            <p className="py-20 text-center text-sm text-[#6b6258] print:hidden">
              {emptyLabel}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {categories.map((category) => (
                <BarcodeCard
                  key={category.id}
                  category={category}
                  locale={locale}
                  companyName={companyName}
                />
              ))}
            </div>
          )}

          <footer className="mt-10 flex items-center justify-between border-t border-[#c9a96e]/35 pt-4 text-[10px] tracking-[0.2em] text-[#8a7040] uppercase">
            <span>{companyName}</span>
            <span>A4 · Code 128</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function BarcodeCard({
  category,
  locale,
  companyName,
}: {
  category: Category;
  locale: string;
  companyName: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const value = categoryBarcodeValue(category);
  const name = categoryName(category, locale as "ku" | "ar" | "en");

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 12,
        height: 54,
        margin: 8,
        background: "#ffffff",
        lineColor: "#1f1c17",
        textMargin: 4,
      });
    } catch {
      // ignore invalid values
    }
  }, [value]);

  return (
    <article className="rounded-2xl border border-[#d8c9a8] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-[#8a7040] uppercase">
            {companyName}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#2a241c]">{name}</h2>
        </div>
        <span className="rounded-full bg-[#f3eee4] px-2.5 py-1 text-[10px] tracking-wide text-[#6b6258]">
          Main
        </span>
      </div>
      <div className="flex justify-center rounded-xl border border-[#eee6d6] bg-[#fcfbf8] py-3">
        <svg ref={svgRef} className="max-w-full" />
      </div>
    </article>
  );
}
