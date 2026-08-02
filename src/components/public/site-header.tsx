"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Phone } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { phoneTelHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getSidebarSide } from "@/lib/rtl";
import type { WebsiteSettings } from "@/types/database";
import { LocaleSwitcher } from "@/components/public/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { PhoneText } from "@/components/ui/phone-link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navKeys = [
  { href: "#categories", key: "products" as const },
  { href: "#projects", key: "projects" as const },
  { href: "#gallery", key: "gallery" as const },
  { href: "#about", key: "about" as const },
  { href: "#contact", key: "contact" as const },
] as const;

type SiteHeaderProps = {
  settings: WebsiteSettings | null;
  locale: Locale;
  direction?: "ltr" | "rtl";
};

export function SiteHeader({
  settings,
  locale,
  direction = "ltr",
}: SiteHeaderProps) {
  const companyName = settings?.company_name ?? "Nova Home Decor";
  const [scrolled, setScrolled] = useState(false);
  const sheetSide = getSidebarSide(direction);
  const telHref = phoneTelHref(settings?.phone_number);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 pt-[env(safe-area-inset-top)]",
        scrolled
          ? "showroom-glass border-b border-border py-2.5 shadow-soft"
          : "bg-transparent py-5",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 transition-all duration-500 md:px-10 lg:px-14",
          scrolled ? "h-14" : "h-16 md:h-[4.5rem]",
        )}
      >
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 md:gap-3.5"
        >
          {settings?.company_logo ? (
            <span
              className={cn(
                "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/90 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-all duration-500 dark:border-white/10 dark:bg-white/95",
                scrolled
                  ? "h-11 w-[7.5rem] px-2 sm:w-36"
                  : "h-12 w-36 px-2.5 sm:h-14 sm:w-44 md:h-16 md:w-52",
              )}
            >
              <Image
                src={settings.company_logo}
                alt={companyName}
                fill
                sizes="(max-width: 640px) 144px, 208px"
                className="object-contain p-1.5 transition duration-500 group-hover:scale-[1.03] sm:p-2"
                priority
              />
            </span>
          ) : (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground transition-all duration-500",
                scrolled ? "size-11 text-sm" : "size-14 text-base",
              )}
            >
              {companyName.slice(0, 1)}
            </span>
          )}
          <span
            className={cn(
              "truncate font-display font-medium tracking-tight transition-all duration-500",
              scrolled
                ? "text-base text-foreground md:text-lg"
                : "text-lg text-[var(--hero-nav-fg)] md:text-xl",
              settings?.company_logo && "hidden sm:inline",
            )}
          >
            {companyName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navKeys.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm tracking-wide transition-colors",
                scrolled
                  ? "text-muted-foreground hover:text-[var(--gold)]"
                  : "text-[var(--hero-nav-fg)]/85 hover:text-[var(--hero-nav-fg)]",
              )}
            >
              {t(locale, "nav", link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          {telHref ? (
            <ButtonLink
              variant="outline"
              size="sm"
              href={telHref}
              dir="ltr"
              className={cn(
                "rounded-[20px] border-current transition-all duration-500",
                scrolled
                  ? "h-8 border-border text-foreground"
                  : "border-[var(--hero-overlay-border)] text-[var(--hero-nav-fg)] hover:bg-[var(--hero-overlay-bg)] hover:text-[var(--hero-nav-fg)]",
              )}
            >
              <Phone className="size-4 shrink-0" />
              <span className="hidden xl:inline">
                <PhoneText phone={settings?.phone_number} />
              </span>
              <span className="xl:hidden">{t(locale, "common", "call_us")}</span>
            </ButtonLink>
          ) : null}
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-11 lg:hidden",
                  !scrolled &&
                    "text-[var(--hero-nav-fg)] hover:bg-[var(--hero-overlay-bg)] hover:text-[var(--hero-nav-fg)]",
                )}
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side={sheetSide} className="w-[min(100vw-1rem,20rem)] sm:w-80">
            <nav className="mt-10 flex flex-col gap-1">
              {navKeys.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-display inline-flex min-h-12 items-center text-2xl font-medium transition-colors hover:text-[var(--gold)]"
                >
                  {t(locale, "nav", link.key)}
                </a>
              ))}
              <a
                href="/wishlist"
                className="font-display inline-flex min-h-12 items-center text-2xl font-medium transition-colors hover:text-[var(--gold)]"
              >
                {t(locale, "common", "wishlist")}
              </a>
              <a
                href="/search"
                className="font-display inline-flex min-h-12 items-center text-2xl font-medium transition-colors hover:text-[var(--gold)]"
              >
                {t(locale, "common", "search")}
              </a>
              <div className="mt-6 flex flex-col gap-3 border-t pt-6">
                <LocaleSwitcher />
                <ThemeToggle />
                {telHref ? (
                  <ButtonLink
                    variant="outline"
                    href={telHref}
                    dir="ltr"
                    className="min-h-11 w-full justify-center rounded-[20px]"
                  >
                    <Phone className="size-4 shrink-0" />
                    <PhoneText phone={settings?.phone_number} />
                  </ButtonLink>
                ) : null}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
