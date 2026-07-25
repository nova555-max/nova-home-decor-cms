"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { resolvePublicEnvWithDefaults } from "@/config/public-env-defaults";
import type { WebsiteSettings } from "@/types/database";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useAdminT } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ShowroomQrManagerProps = {
  settings: WebsiteSettings | null;
};

type PosterCopy = {
  brand: string;
  title: string;
  subtitle: string;
  footer: string;
};

const STORAGE_KEY = "nova-showroom-qr-copy";

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

function defaultCopy(companyName: string, t: (key: string) => string): PosterCopy {
  return {
    brand: companyName,
    title: t("barcodes.sheet_title"),
    subtitle: t("barcodes.sheet_subtitle"),
    footer: t("barcodes.sheet_footer"),
  };
}

function loadStoredCopy(fallback: PosterCopy): PosterCopy {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PosterCopy>;
    return {
      brand: parsed.brand?.trim() || fallback.brand,
      title: parsed.title?.trim() || fallback.title,
      subtitle: parsed.subtitle?.trim() || fallback.subtitle,
      footer: parsed.footer?.trim() || fallback.footer,
    };
  } catch {
    return fallback;
  }
}

export function ShowroomQrManager({ settings }: ShowroomQrManagerProps) {
  const t = useAdminT();
  const companyName = settings?.company_name?.trim() || "Nova Home Decor";
  const baseUrl = siteBaseUrl();
  const fallback = defaultCopy(companyName, t);

  const [copy, setCopy] = useState<PosterCopy>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const [qrImage, setQrImage] = useState("");

  useEffect(() => {
    setCopy(loadStoredCopy(fallback));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from storage
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
  }, [copy, hydrated]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(baseUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1a1712", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("barcodes.generate_failed"));
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, t]);

  const handlePrint = () => window.print();

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      toast.success(t("barcodes.link_copied"));
    } catch {
      toast.error(t("barcodes.copy_failed"));
    }
  };

  const resetCopy = () => {
    setCopy(defaultCopy(companyName, t));
    toast.success(t("barcodes.reset_done"));
  };

  return (
    <div className="space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { size: A4; margin: 0; }
  body * { visibility: hidden !important; }
  #showroom-qr-sheet, #showroom-qr-sheet * { visibility: visible !important; }
  #showroom-qr-sheet {
    position: absolute !important;
    inset: 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    max-width: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
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
            <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="size-4" />
              {t("barcodes.copy_link")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetCopy}>
              {t("barcodes.reset_text")}
            </Button>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qr-brand">{t("barcodes.field_brand")}</Label>
            <Input
              id="qr-brand"
              value={copy.brand}
              onChange={(e) =>
                setCopy((prev) => ({ ...prev, brand: e.target.value }))
              }
              placeholder={companyName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr-title">{t("barcodes.field_title")}</Label>
            <Input
              id="qr-title"
              value={copy.title}
              onChange={(e) =>
                setCopy((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="qr-subtitle">{t("barcodes.field_subtitle")}</Label>
            <Textarea
              id="qr-subtitle"
              rows={3}
              value={copy.subtitle}
              onChange={(e) =>
                setCopy((prev) => ({ ...prev, subtitle: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="qr-footer">{t("barcodes.field_footer")}</Label>
            <Input
              id="qr-footer"
              value={copy.footer}
              onChange={(e) =>
                setCopy((prev) => ({ ...prev, footer: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="border-border/40 overflow-x-auto rounded-2xl border bg-[#ece7dc] p-4 print:border-0 print:bg-transparent print:p-0">
        <div
          id="showroom-qr-sheet"
          className="relative mx-auto flex w-[210mm] max-w-full flex-col overflow-hidden bg-[#f7f2e8] text-[#1a1712] shadow-xl print:shadow-none"
          style={{ minHeight: "297mm" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 18%, rgba(201,169,110,0.34), transparent 52%), linear-gradient(165deg, #faf6ee 0%, #f0e8d8 48%, #e8dfcf 100%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-6 rounded-[28px] border border-[#c9a96e]/35"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-8 rounded-[22px] border border-[#c9a96e]/18"
            aria-hidden
          />

          <div className="relative flex flex-1 flex-col items-center justify-between px-12 py-14 text-center">
            <header className="w-full max-w-xl space-y-4">
              <p className="text-[12px] font-semibold tracking-[0.42em] text-[#8a7040] uppercase">
                {copy.brand || companyName}
              </p>
              <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight text-[#241f18] md:text-5xl">
                {copy.title}
              </h1>
              <p className="mx-auto max-w-md text-base leading-relaxed whitespace-pre-wrap text-[#6b6258]">
                {copy.subtitle}
              </p>
            </header>

            <div className="my-10 flex flex-col items-center">
              <div className="rounded-[28px] border border-[#d8c9a8] bg-white p-6 shadow-[0_24px_60px_-28px_rgba(36,31,24,0.45)]">
                {qrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImage}
                    alt={copy.title || companyName}
                    className="size-56 md:size-64"
                  />
                ) : (
                  <div className="size-56 animate-pulse rounded-2xl bg-[#efe8da] md:size-64" />
                )}
              </div>
              <p className="mt-5 max-w-sm break-all font-mono text-[11px] tracking-wide text-[#8a7040]">
                {baseUrl}
              </p>
            </div>

            <footer className="w-full max-w-lg space-y-3">
              <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent" />
              <p className="text-sm whitespace-pre-wrap text-[#6b6258]">
                {copy.footer}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
