"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nova-pwa-install-dismissed";

export function PwaInstallBanner() {
  const { locale } = useDirection();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/admin")) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "border-border bg-card/95 fixed inset-x-3 z-[70] flex items-center gap-3 rounded-2xl border p-3 shadow-soft-lg backdrop-blur-xl",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:start-auto md:end-6 md:max-w-sm",
      )}
      role="dialog"
      aria-label={t(locale, "pwa", "install_title")}
    >
      <div className="bg-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground">
        N
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t(locale, "pwa", "install_title")}</p>
        <p className="text-muted-foreground text-xs leading-snug">
          {t(locale, "pwa", "install_desc")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="bg-primary text-primary-foreground inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-3 text-xs font-medium"
      >
        <Download className="size-4" />
        {t(locale, "pwa", "install")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center rounded-xl"
        aria-label={t(locale, "common", "close")}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
