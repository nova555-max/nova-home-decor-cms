"use client";

import { useState } from "react";

import { useDirection } from "@/hooks";
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
import { HomepageOrderedSections } from "@/components/public/homepage-ordered-sections";
import { ShowroomTheme } from "@/components/public/showroom-theme";
import { SiteHeader } from "@/components/public/site-header";
import { ShowroomChrome } from "@/components/public/showroom/showroom-chrome";
import dynamic from "next/dynamic";

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

type PublicHomeProps = {
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  categories: Category[];
  products: Product[];
  projects: Project[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  office: OfficeLocation | null;
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
}: PublicHomeProps) {
  const { locale, direction } = useDirection();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const manager = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );
  const orderedSections = getOrderedPublicSections(manager);
  const footerSection = manager.sections.find((section) => section.type === "footer");

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
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
        />
      </main>

      {footerSection && isSectionPubliclyVisible(footerSection) ? (
        <SiteFooter settings={settings} locale={locale} office={office} />
      ) : null}
    </div>
  );
}
