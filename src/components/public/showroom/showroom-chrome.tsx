"use client";

import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WebsiteSettings } from "@/types/database";
import { cn } from "@/lib/utils";

type ShowroomChromeProps = {
  settings: WebsiteSettings | null;
  locale: Locale;
};

/** FAB stack above mobile bottom nav + AI launcher; clear of iOS home indicator. */
const fabStack =
  "fixed z-50 end-4 md:end-8 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6";

export function ShowroomChrome({ settings, locale }: ShowroomChromeProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const waLink = whatsappLink(settings?.whatsapp_number);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setShowBackToTop(scrollTop > 480);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div
        className="showroom-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
        aria-hidden
      />

      <div className={cn(fabStack, "flex flex-col items-center gap-3")}>
        <AnimatePresence>
          {showBackToTop ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              onClick={scrollToTop}
              className="showroom-glass flex size-12 items-center justify-center rounded-full border border-border text-foreground shadow-soft transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
              aria-label={t(locale, "common", "back_to_top")}
            >
              <ArrowUp className="size-5" />
            </motion.button>
          ) : null}
        </AnimatePresence>

        {waLink ? (
          <motion.a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex size-14 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] shadow-soft-lg transition hover:scale-105 hover:shadow-soft-xl"
            aria-label={t(locale, "common", "whatsapp")}
          >
            <MessageCircle className="size-6" />
          </motion.a>
        ) : null}
      </div>
    </>
  );
}
