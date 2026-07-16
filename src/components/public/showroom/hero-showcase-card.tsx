"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "@/lib/motion";

import { cn } from "@/lib/utils";

type HeroShowcaseCardProps = {
  label: string;
  image?: string | null;
  href: string;
  className?: string;
  floatDelay?: number;
  floatDuration?: number;
  index?: number;
  layout?: "floating" | "grid";
};

export function HeroShowcaseCard({
  label,
  image,
  href,
  className,
  floatDelay = 0,
  floatDuration = 5,
  index = 0,
  layout = "floating",
}: HeroShowcaseCardProps) {
  const isGrid = layout === "grid";

  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.85,
        delay: 0.35 + index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn("group", isGrid ? "relative w-full" : "absolute", className)}
    >
      <motion.div
        animate={isGrid ? undefined : { y: [0, -14, 0] }}
        transition={
          isGrid
            ? undefined
            : {
                duration: floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: floatDelay,
              }
        }
      >
        <Link
          href={href}
          className={cn(
            "hero-showcase-card block overflow-hidden rounded-[20px] border border-[var(--hero-overlay-border)] bg-[var(--hero-overlay-bg)] backdrop-blur-xl transition-all duration-500 hover:scale-[1.04] hover:border-[var(--gold)]/50",
            isGrid
              ? "shadow-soft-lg hover:shadow-soft-xl"
              : "hero-card-shadow hover:hero-card-shadow-hover",
          )}
        >
          <div className="relative aspect-[4/5] w-full">
            {image ? (
              <Image
                src={image}
                alt={label}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 40vw, 220px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--hero-overlay-bg)] via-primary/30 to-[var(--primary-hover)]/50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-hover)]/75 via-[var(--primary-hover)]/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <span className="inline-block rounded-full bg-[var(--gold)]/90 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-[var(--gold-foreground)] uppercase">
                {label}
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
