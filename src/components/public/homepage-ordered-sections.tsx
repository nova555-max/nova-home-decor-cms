"use client";

import type { Locale } from "@/config/site";
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
import type { HomepageSectionSetting } from "@/types/homepage-sections";
import { HeroSection } from "@/components/public/hero-section";
import { StatsSection } from "@/components/public/stats-section";
import dynamic from "next/dynamic";

const CategoriesShowcaseSection = dynamic(
  () =>
    import("@/components/public/categories-showcase-section").then((m) => ({
      default: m.CategoriesShowcaseSection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const ProductsShowcaseSection = dynamic(
  () =>
    import("@/components/public/products-showcase-section").then((m) => ({
      default: m.ProductsShowcaseSection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const AboutSection = dynamic(
  () =>
    import("@/components/public/about-section").then((m) => ({
      default: m.AboutSection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const ProjectsSection = dynamic(
  () =>
    import("@/components/public/projects-section").then((m) => ({
      default: m.ProjectsSection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const GallerySection = dynamic(
  () =>
    import("@/components/public/gallery-section").then((m) => ({
      default: m.GallerySection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const WhyChooseUsSection = dynamic(
  () =>
    import("@/components/public/why-choose-us-section").then((m) => ({
      default: m.WhyChooseUsSection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const TestimonialsSection = dynamic(
  () =>
    import("@/components/public/testimonials-section").then((m) => ({
      default: m.TestimonialsSection,
    })),
  { loading: () => <SectionPlaceholder /> },
);

const QuoteRequestSection = dynamic(
  () =>
    import("@/components/public/quote-request-section").then((m) => ({
      default: m.QuoteRequestSection,
    })),
  { loading: () => <SectionPlaceholder className="h-96" /> },
);

const ContactSection = dynamic(
  () =>
    import("@/components/public/contact-section").then((m) => ({
      default: m.ContactSection,
    })),
  { loading: () => <SectionPlaceholder className="h-80" /> },
);

const ContactCtaSection = dynamic(
  () =>
    import("@/components/public/contact-cta-section").then((m) => ({
      default: m.ContactCtaSection,
    })),
  { loading: () => <SectionPlaceholder className="h-72" /> },
);

function SectionPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`mx-auto w-full max-w-[1400px] animate-pulse rounded-[20px] bg-muted/60 ${className ?? "h-64"}`}
    />
  );
}

type HomepageOrderedSectionsProps = {
  sections: HomepageSectionSetting[];
  settings: WebsiteSettings | null;
  homepage: HomepageContent | null;
  locale: Locale;
  categories: Category[];
  products: Product[];
  projects: Project[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  office: OfficeLocation | null;
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
};

export function HomepageOrderedSections({
  sections,
  settings,
  homepage,
  locale,
  categories,
  products,
  projects,
  gallery,
  testimonials,
  office,
  activeCategoryId,
  onSelectCategory,
}: HomepageOrderedSectionsProps) {
  const renderedTypes = new Set<string>();

  return (
    <>
      {sections.map((section) => {
        if (section.type === "footer" || section.type === "ai_assistant") {
          return null;
        }

        if (section.is_custom) {
          return null;
        }

        if (renderedTypes.has(section.type)) {
          return null;
        }
        renderedTypes.add(section.type);

        const key = section.id;

        switch (section.type) {
          case "hero":
            return (
              <div key={key} id={`section-${section.id}`}>
                <HeroSection
                  settings={settings}
                  homepage={homepage}
                  locale={locale}
                  categories={categories}
                  products={products}
                />
              </div>
            );
          case "stats":
            return (
              <div key={key} id={`section-${section.id}`}>
                <StatsSection homepage={homepage} locale={locale} />
              </div>
            );
          case "categories":
            return (
              <div key={key} id={`section-${section.id}`}>
                <CategoriesShowcaseSection
                  categories={categories}
                  homepage={homepage}
                  locale={locale}
                  onSelectCategory={onSelectCategory}
                />
              </div>
            );
          case "products":
            return (
              <div key={key} id={`section-${section.id}`}>
                <ProductsShowcaseSection
                  categories={categories}
                  products={products}
                  homepage={homepage}
                  locale={locale}
                  activeCategoryId={activeCategoryId}
                  onCategoryChange={onSelectCategory}
                />
              </div>
            );
          case "projects":
            return (
              <div key={key} id={`section-${section.id}`}>
                <ProjectsSection
                  projects={projects}
                  homepage={homepage}
                  locale={locale}
                />
              </div>
            );
          case "gallery":
            return (
              <div key={key} id={`section-${section.id}`}>
                <GallerySection
                  items={gallery}
                  homepage={homepage}
                  locale={locale}
                />
              </div>
            );
          case "about":
            return (
              <div key={key} id={`section-${section.id}`}>
                <AboutSection homepage={homepage} locale={locale} />
              </div>
            );
          case "why_choose_us":
            return (
              <div key={key} id={`section-${section.id}`}>
                <WhyChooseUsSection homepage={homepage} locale={locale} />
              </div>
            );
          case "testimonials":
            return (
              <div key={key} id={`section-${section.id}`}>
                <TestimonialsSection
                  items={testimonials}
                  homepage={homepage}
                  locale={locale}
                />
              </div>
            );
          case "quote":
            return (
              <div key={key} id={`section-${section.id}`}>
                <QuoteRequestSection
                  settings={settings}
                  homepage={homepage}
                  locale={locale}
                />
              </div>
            );
          case "contact":
            return (
              <div key={key} id={`section-${section.id}`}>
                <ContactSection
                  settings={settings}
                  homepage={homepage}
                  locale={locale}
                  office={office}
                />
              </div>
            );
          case "contact_cta":
            return (
              <div key={key} id={`section-${section.id}`}>
                <ContactCtaSection
                  settings={settings}
                  homepage={homepage}
                  locale={locale}
                  office={office}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
