"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Phone, Search, ShoppingBag } from "lucide-react";

import { useDirection } from "@/hooks";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", key: "home" as const, icon: Home, match: (p: string) => p === "/" },
  {
    href: "/#products",
    key: "products" as const,
    icon: ShoppingBag,
    match: () => false,
  },
  {
    href: "/search",
    key: "search" as const,
    icon: Search,
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/wishlist",
    key: "wishlist" as const,
    icon: Heart,
    match: (p: string) => p.startsWith("/wishlist"),
  },
  {
    href: "/#contact",
    key: "contact" as const,
    icon: Phone,
    match: () => false,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { locale } = useDirection();

  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    return null;
  }

  return (
    <nav
      className={cn(
        "border-border bg-card/95 fixed inset-x-0 bottom-0 z-[55] border-t backdrop-blur-xl md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label={t(locale, "bottom_nav", "home")}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "text-muted-foreground flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active && "text-[var(--gold)]",
                )}
              >
                <Icon className={cn("size-5", active && "fill-current")} />
                <span>{t(locale, "bottom_nav", item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
