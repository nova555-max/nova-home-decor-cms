"use client";

import type { ReactNode } from "react";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const dashboardCardClass =
  "rounded-[18px] border border-border bg-glass-surface shadow-card backdrop-blur-sm";

export const dashboardHoverClass =
  "transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover";

type DashboardSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
  id,
}: DashboardSectionProps) {
  return (
    <section id={id} className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type DashboardCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function DashboardCard({
  children,
  className,
  hover = false,
  padding = "md",
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        dashboardCardClass,
        paddingMap[padding],
        hover && dashboardHoverClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardMotionSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[15px] font-semibold tracking-[-0.02em] text-foreground",
        className,
      )}
    >
      {title}
    </h2>
  );
}
