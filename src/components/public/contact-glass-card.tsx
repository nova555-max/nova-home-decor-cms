"use client";

import type { ReactNode } from "react";
import { motion } from "@/lib/motion";

import { cn } from "@/lib/utils";

type ContactGlassCardProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
  delay?: number;
};

/** Premium glassmorphism contact card with soft gold accent. */
export function ContactGlassCard({
  icon,
  title,
  children,
  href,
  target,
  rel,
  className,
  delay = 0,
}: ContactGlassCardProps) {
  const inner = (
    <>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 text-[var(--gold)] shadow-[0_8px_24px_-12px_rgb(201_169_110_/_0.55)]">
        {icon}
      </div>
      <h3 className="font-display text-lg font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <div className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {children}
      </div>
    </>
  );

  const shellClass = cn(
    "showroom-glass group relative block overflow-hidden rounded-[22px] border border-white/40 p-6 shadow-[0_18px_48px_-24px_rgb(47_47_47_/_0.28)] backdrop-blur-xl transition duration-500",
    "hover:-translate-y-1 hover:border-[var(--gold)]/40 hover:shadow-[0_22px_56px_-20px_rgb(201_169_110_/_0.35)]",
    "dark:border-white/10",
    href && "cursor-pointer",
    className,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {href ? (
        <a href={href} target={target} rel={rel} className={shellClass}>
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent"
            aria-hidden
          />
          {inner}
        </a>
      ) : (
        <div className={shellClass}>
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent"
            aria-hidden
          />
          {inner}
        </div>
      )}
    </motion.div>
  );
}
