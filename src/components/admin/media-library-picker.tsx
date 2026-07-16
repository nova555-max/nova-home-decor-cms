"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Images } from "lucide-react";

import type { MediaAsset } from "@/types/database";
import { useAdminT } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MediaLibraryPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: MediaAsset[];
  onSelect: (url: string) => void;
  multiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
};

export function MediaLibraryPicker({
  open,
  onOpenChange,
  assets,
  onSelect,
  multiple,
  onSelectMultiple,
}: MediaLibraryPickerProps) {
  const t = useAdminT();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = assets.filter((a) =>
    a.filename.toLowerCase().includes(filter.toLowerCase()),
  );

  const toggle = (url: string) => {
    if (!multiple) {
      onSelect(url);
      onOpenChange(false);
      return;
    }
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  };

  const confirmMultiple = () => {
    onSelectMultiple?.(selected);
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="size-5" />
            {t("media.pick")}
          </DialogTitle>
        </DialogHeader>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("media.search")}
          className="rounded-xl"
        />
        <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {filtered.length ? (
            filtered.map((asset) => {
              const isSelected = selected.includes(asset.url);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggle(asset.url)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent",
                  )}
                >
                  <Image
                    src={asset.url}
                    alt={asset.filename}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                  {isSelected ? (
                    <span className="bg-primary absolute end-1.5 top-1.5 flex size-5 items-center justify-center rounded-full text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-primary/80 px-1 py-0.5 text-[10px] text-primary-foreground opacity-0 transition group-hover:opacity-100">
                    {asset.filename}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground col-span-full py-12 text-center text-sm">
              {t("common.no_items")}
            </p>
          )}
        </div>
        {multiple ? (
          <Button
            type="button"
            className="rounded-xl"
            disabled={!selected.length}
            onClick={confirmMultiple}
          >
            {t("media.add_selected")} ({selected.length})
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
