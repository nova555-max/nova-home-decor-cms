"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  DashboardMotionSection,
  DashboardSection,
  SectionTitle,
} from "@/components/admin/dashboard/dashboard-primitives";
import { td } from "@/lib/i18n/dashboard-dictionaries";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useDirection } from "@/hooks";

const linkActions = [
  {
    href: "/admin/products",
    labelKey: "add_product",
    descKey: "add_product_desc",
    icon: "➕",
  },
  {
    href: "/admin/categories",
    labelKey: "add_category",
    descKey: "add_category_desc",
    icon: "📂",
  },
  {
    href: "/admin/gallery",
    labelKey: "upload_gallery",
    descKey: "upload_gallery_desc",
    icon: "🖼️",
  },
  {
    href: "/admin/projects",
    labelKey: "add_project",
    descKey: "add_project_desc",
    icon: "🎁",
  },
  {
    href: "/admin/settings",
    labelKey: "website_settings",
    descKey: "website_settings_desc",
    icon: "⚙️",
  },
] as const;

export function DashboardQuickActions() {
  const { locale, isRtl } = useDirection();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const scrollToAi = () => {
    document
      .getElementById("dashboard-ai")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector<HTMLButtonElement>("[data-ai-chat-trigger]")?.click();
  };

  return (
    <DashboardMotionSection>
      <DashboardSection title={td(locale, "quick_actions")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {linkActions.map(({ href, labelKey, descKey, icon }, index) => (
            <ActionCard
              key={href}
              href={href}
              title={td(locale, labelKey)}
              description={td(locale, descKey)}
              icon={icon}
              index={index}
              ArrowIcon={ArrowIcon}
              isRtl={isRtl}
            />
          ))}
          <ActionCardButton
            title={td(locale, "ai_assistant")}
            description={td(locale, "ai_assistant_desc")}
            icon="🤖"
            index={linkActions.length}
            ArrowIcon={ArrowIcon}
            isRtl={isRtl}
            onClick={scrollToAi}
          />
        </div>
      </DashboardSection>
    </DashboardMotionSection>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
  index,
  ArrowIcon,
  isRtl,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  index: number;
  ArrowIcon: typeof ArrowRight;
  isRtl: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={href} className="group block outline-none">
        <QuickActionSurface
          title={title}
          description={description}
          icon={icon}
          ArrowIcon={ArrowIcon}
          isRtl={isRtl}
        />
      </Link>
    </motion.div>
  );
}

function ActionCardButton({
  title,
  description,
  icon,
  index,
  ArrowIcon,
  isRtl,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  index: number;
  ArrowIcon: typeof ArrowRight;
  isRtl: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        onClick={onClick}
        className="group block w-full text-start outline-none"
        aria-label={title}
      >
        <QuickActionSurface
          title={title}
          description={description}
          icon={icon}
          ArrowIcon={ArrowIcon}
          isRtl={isRtl}
        />
      </button>
    </motion.div>
  );
}

function QuickActionSurface({
  title,
  description,
  icon,
  ArrowIcon,
  isRtl,
}: {
  title: string;
  description: string;
  icon: string;
  ArrowIcon: typeof ArrowRight;
  isRtl: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "relative flex h-[120px] cursor-pointer items-center gap-4 rounded-[18px] border border-border bg-glass-surface p-6 shadow-card backdrop-blur-sm",
        "transition-[border-color,box-shadow] duration-300 ease-out",
        "group-hover:border-primary group-hover:shadow-card-hover",
        "group-focus-visible:ring-2 group-focus-visible:ring-primary/40 group-focus-visible:ring-offset-2",
        isRtl ? "flex-row-reverse text-right" : "flex-row text-left",
      )}
    >
      <div
        className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background transition-colors duration-300 group-hover:border-gold/40 group-hover:bg-primary/[0.06]"
        aria-hidden
      >
        <span className="text-[30px] leading-none select-none">{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-gold transition-all duration-300",
          "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
          isRtl && "translate-x-1 group-hover:translate-x-0",
        )}
        aria-hidden
      >
        <ArrowIcon className="size-[18px] stroke-[2px]" />
      </div>
    </motion.div>
  );
}

export { SectionTitle };
