"use client";

import { AdminLink } from "@/components/admin/admin-link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motion";

import type { SearchItem } from "@/types/dashboard";
import { useAdminT, useDirection } from "@/hooks";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type GlobalSearchProps = {
  items: SearchItem[];
  className?: string;
};

export function GlobalSearch({ items, className }: GlobalSearchProps) {
  const t = useAdminT();
  const { direction } = useDirection();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [items, query]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={t("search.placeholder")}
        dir={direction}
        className="bg-muted/50 h-11 rounded-xl border-border/40 ps-9 shadow-sm md:h-9"
      />
      <AnimatePresence>
        {focused && query.trim() ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="border-border/60 bg-popover/95 absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border shadow-xl backdrop-blur-xl"
          >
            {results.length ? (
              results.map((result) => (
                <AdminLink
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  onClick={() => setQuery("")}
                  className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{result.title}</p>
                    {result.subtitle ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {result.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[10px] uppercase">
                    {t(`search.types.${result.type}`)}
                  </span>
                </AdminLink>
              ))
            ) : (
              <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                {t("search.no_results")}
              </p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
