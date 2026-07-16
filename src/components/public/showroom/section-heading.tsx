"use client";

import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "start",
  className,
}: SectionHeadingProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "mx-auto max-w-3xl text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-showroom-accent mb-3 text-xs font-medium tracking-[0.28em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-[clamp(2rem,1.5rem+2vw,3.25rem)] leading-[1.1] font-medium tracking-tight">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-showroom-muted mt-4 max-w-2xl text-base leading-relaxed md:text-lg">
          {subtitle}
        </p>
      ) : null}
    </motion.header>
  );
}
