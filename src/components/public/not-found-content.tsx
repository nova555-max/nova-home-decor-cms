"use client";

import Link from "next/link";
import { Home } from "lucide-react";

import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button-link";

export function NotFoundContent() {
  const { locale } = useDirection();

  return (
    <div
      data-showroom
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
    >
      <p className="text-showroom-accent text-xs tracking-[0.32em] uppercase">
        404
      </p>
      <h1 className="font-display mt-4 text-[clamp(2.5rem,2rem+3vw,4rem)] font-medium tracking-tight text-foreground">
        {t(locale, "not_found", "title")}
      </h1>
      <p className="text-showroom-muted mt-4 max-w-md text-base leading-relaxed">
        {t(locale, "not_found", "subtitle")}
      </p>
      <ButtonLink
        href="/"
        variant="gold"
        size="lg"
        className="mt-10 gap-2 rounded-[20px] px-8 shadow-soft transition-all hover:scale-[1.03] hover:shadow-soft-lg"
      >
        <Home className="size-4" />
        {t(locale, "not_found", "cta")}
      </ButtonLink>
      <Link
        href="/#contact"
        className="text-showroom-muted mt-6 text-sm transition hover:text-[var(--gold)]"
      >
        {t(locale, "nav", "contact")}
      </Link>
    </div>
  );
}
