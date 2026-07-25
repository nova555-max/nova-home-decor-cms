"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { useDirection } from "@/hooks";
import { categoryHasChildren } from "@/lib/categories/tree";
import {
  getOrderedPublicSections,
  isSectionPubliclyVisible,
  normalizeSectionManager,
} from "@/lib/homepage/section-registry";
import type {
  Category,
  GalleryItem,
  HomepageContent,
  Product,
  Project,
  Testimonial,
  WebsiteSettings,
} from "@/types/database";
import type { OfficeLocation } from "@/types/office-location";
import type { HeroSlide } from "@/types/hero-slides";
import { HomepageOrderedSections } from "@/components/public/homepage-ordered-sections";
import { ShowroomTheme } from "@/components/public/showroom-theme";
import { SiteHeader } from "@/components/public/site-header";
import { ShowroomChrome } from "@/components/public/showroom/showroom-chrome";

const SiteFooter = dynamic(
  () =>
    import("@/components/public/site-footer").then((m) => ({
      default: m.SiteFooter,
    })),
  { loading: () => <SectionPlaceholder className="h-48" /> },
);

function SectionPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`mx-auto w-full max-w-[1400px] animate-pulse rounded-[20px] bg-muted/60 ${className ?? "h-64"}`}
    />
  );
}

function findCategoryFromQuery(categories: Category[]): Category | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("c")?.trim().toLowerCase();
  if (!slug) return null;
  return (
    categories.find((c) => c.slug?.toLowerCase() === slug) ??
    categories.find((c) => c.id === slug) ??
    null
  );
}

type PublicHomeProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  categories: Category[];
  products: Product[];
  projects: Project[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  office: OfficeLocation | null;
  heroSlides?: HeroSlide[];
};

export function PublicHome({
  settings,
  homepage,
  categories,
  products,
  projects,
  gallery,
  testimonials,
  office,
  heroSlides = [],
}: PublicHomeProps) {
  const { locale, direction } = useDirection();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [browseParentId, setBrowseParentId] = useState<string | null>(null);

  useEffect(() => {
    const fromQr = findCategoryFromQuery(categories);
    if (!fromQr) return;

    if (categoryHasChildren(categories, fromQr.id)) {
      setBrowseParentId(fromQr.id);
      setActiveCategoryId(null);
      requestAnimationFrame(() => {
        document.getElementById("categories")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    setActiveCategoryId(fromQr.id);
    setBrowseParentId(fromQr.parent_id ?? null);
    requestAnimationFrame(() => {
      document.getElementById("products")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [categories]);

  const manager = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );
  const orderedSections = getOrderedPublicSections(manager);
  const footerSection = manager.sections.find(
    (section) => section.type === "footer",
  );

  const handleSelectCategory = (id: string | null) => {
    if (id === null) {
      setBrowseParentId(null);
      setActiveCategoryId(null);
      return;
    }

    if (categoryHasChildren(categories, id)) {
      setBrowseParentId(id);
      setActiveCategoryId(null);
      requestAnimationFrame(() => {
        document.getElementById("categories")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    const selected = categories.find((c) => c.id === id);
    setActiveCategoryId(id);
    setBrowseParentId(selected?.parent_id ?? null);
    requestAnimationFrame(() => {
      document.getElementById("products")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleBrowseBack = () => {
    setBrowseParentId(null);
    setActiveCategoryId(null);
  };

  return (
    <div data-showroom className="bg-background text-foreground pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <ShowroomTheme settings={settings} />
      <SiteHeader settings={settings} locale={locale} direction={direction} />
      <ShowroomChrome settings={settings} locale={locale} />
      <main>
        <HomepageOrderedSections
          sections={orderedSections}
          settings={settings}
          homepage={homepage}
          locale={locale}
          categories={categories}
          products={products}
          projects={projects}
          gallery={gallery}
          testimonials={testimonials}
          office={office}
          heroSlides={heroSlides}
          activeCategoryId={activeCategoryId}
          browseParentId={browseParentId}
          onSelectCategory={handleSelectCategory}
          onBrowseBack={handleBrowseBack}
        />
      </main>

      {footerSection && isSectionPubliclyVisible(footerSection) ? (
        <SiteFooter settings={settings} locale={locale} office={office} />
      ) : null}
    </div>
  );
}
