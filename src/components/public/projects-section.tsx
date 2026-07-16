"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { formatDate } from "@/lib/format";
import { localized, t } from "@/lib/i18n";
import { getSectionHeading } from "@/lib/showroom/content";
import { projectTitle, type HomepageContent, type Project } from "@/types/database";
import { SectionHeading } from "@/components/public/showroom/section-heading";
import { cn } from "@/lib/utils";

type ProjectsSectionProps = {
  projects: Project[];
  homepage: HomepageContent | null;
  locale: Locale;
};

export function ProjectsSection({
  projects,
  homepage,
  locale,
}: ProjectsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const go = useCallback(
    (delta: number) => {
      setActiveIndex((i) => (i + delta + projects.length) % projects.length);
    },
    [projects.length],
  );

  if (projects.length === 0) {
    return (
      <section id="projects" className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1400px]">
          <SectionHeading
            eyebrow={t(locale, "nav", "projects")}
            title={getSectionHeading(
              homepage,
              locale,
              "projects",
              t(locale, "sections", "projects"),
            )}
          />
          <p className="text-showroom-muted rounded-[20px] border border-dashed border-border p-16 text-center">
            {t(locale, "common", "no_items")}
          </p>
        </div>
      </section>
    );
  }

  const project = projects[activeIndex]!;

  return (
    <section id="projects" className="px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={t(locale, "nav", "projects")}
          title={getSectionHeading(
            homepage,
            locale,
            "projects",
            t(locale, "sections", "projects"),
          )}
        />

        <div className="relative">
          {projects.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="showroom-glass absolute start-0 top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-border shadow-soft transition hover:border-[var(--gold)] hover:text-[var(--gold)] md:inline-flex"
                aria-label="Previous project"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="showroom-glass absolute end-0 top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-border shadow-soft transition hover:border-[var(--gold)] hover:text-[var(--gold)] md:inline-flex"
                aria-label="Next project"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}

          <motion.div
            key={project.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
          >
            <ProjectMedia project={project} locale={locale} />
            <ProjectDetails project={project} locale={locale} />
          </motion.div>

          {projects.length > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-2">
              {projects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === activeIndex
                      ? "w-8 bg-[var(--gold)]"
                      : "w-1.5 bg-border hover:bg-[var(--gold)]/50",
                  )}
                  aria-label={`Project ${i + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProjectMedia({ project, locale }: { project: Project; locale: Locale }) {
  const title = projectTitle(project, locale);
  const beforeImage = project.images[0] ?? project.cover_image;
  const afterImage = project.images[1] ?? null;
  const hasBeforeAfter = Boolean(beforeImage && afterImage);

  if (hasBeforeAfter) {
    return <BeforeAfterSlider before={beforeImage!} after={afterImage!} alt={title} locale={locale} />;
  }

  const image = project.cover_image ?? project.images[0];

  return (
    <div className="showroom-card relative aspect-[16/11] overflow-hidden">
      {image ? (
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-[var(--primary-hover)]" />
      )}
    </div>
  );
}

function BeforeAfterSlider({
  before,
  after,
  alt,
  locale,
}: {
  before: string;
  after: string;
  alt: string;
  locale: Locale;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    updatePosition(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="showroom-card relative aspect-[16/11] cursor-ew-resize select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Image src={after} alt={`${alt} — ${t(locale, "projects", "after")}`} fill className="object-cover" sizes="50vw" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <Image
          src={before}
          alt={`${alt} — ${t(locale, "projects", "before")}`}
          fill
          className="object-cover"
          sizes="50vw"
        />
      </div>
      <div
        className="absolute inset-y-0 z-10 w-0.5 bg-[var(--gold)] shadow-soft"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--gold)] bg-card shadow-soft">
          <span className="text-[10px] font-medium tracking-wider text-[var(--gold)]">↔</span>
        </div>
      </div>
      <span className="showroom-glass absolute start-4 top-4 rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase">
        {t(locale, "projects", "before")}
      </span>
      <span className="showroom-glass absolute end-4 top-4 rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase">
        {t(locale, "projects", "after")}
      </span>
      <p className="absolute inset-x-0 bottom-4 text-center text-[10px] tracking-[0.2em] text-[var(--hero-overlay-fg)]/80 uppercase">
        {t(locale, "projects", "drag_hint")}
      </p>
    </div>
  );
}

function ProjectDetails({ project, locale }: { project: Project; locale: Locale }) {
  const title = projectTitle(project, locale);
  const description = localized(
    project.description_i18n,
    locale,
    project.description ?? "",
  );

  return (
    <div className="space-y-5">
      <p className="text-showroom-accent text-xs tracking-[0.28em] uppercase">
        {[project.location, project.client_name].filter(Boolean).join(" · ")}
      </p>
      <h3 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{title}</h3>
      {description ? (
        <p className="text-showroom-muted max-w-xl text-base leading-relaxed md:text-lg">
          {description}
        </p>
      ) : null}
      {project.completed_at ? (
        <p className="text-xs tracking-[0.2em] uppercase opacity-60">
          {formatDate(project.completed_at)}
        </p>
      ) : null}
    </div>
  );
}
