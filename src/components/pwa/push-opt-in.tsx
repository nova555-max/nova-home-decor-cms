"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";

/** Soft push opt-in — requests browser permission; delivery needs server VAPID in production. */
export function PushOptInButton({ className }: { className?: string }) {
  const { locale } = useDirection();
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    if (!("Notification" in window)) {
      toast.error(t(locale, "pwa", "push_unsupported"));
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.message(t(locale, "pwa", "push_denied"));
        return;
      }
      localStorage.setItem("nova-push-opt-in", "1");
      toast.success(t(locale, "pwa", "push_enabled"));
      if (navigator.serviceWorker?.controller) {
        // Local confirmation notification — proves SW can show alerts.
        await navigator.serviceWorker.ready.then((reg) =>
          reg.showNotification("Nova Home Decor", {
            body: t(locale, "pwa", "push_test_body"),
            icon: "/icons/icon-192.png",
          }),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void enable()}
      className={
        className ??
        "border-border bg-card inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"
      }
    >
      <Bell className="size-4" />
      {t(locale, "pwa", "enable_push")}
    </button>
  );
}
