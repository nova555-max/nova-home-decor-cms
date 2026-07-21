import { PublicHome } from "@/components/public/public-home";
import {
  getHomepageContent,
  getPublicCategories,
  getPublicGallery,
  getPublicProducts,
  getPublicProjects,
  getPublicTestimonials,
  getWebsiteSettings,
} from "@/lib/queries/cms";
import { getActiveOfficeLocation } from "@/lib/queries/office-location";
import { getPublicHeroSlides } from "@/lib/queries/hero-slides";

export const revalidate = 60;

export default async function HomePage() {
  const [
    settings,
    homepage,
    categories,
    products,
    projects,
    gallery,
    testimonials,
    office,
    heroSlides,
  ] = await Promise.all([
    getWebsiteSettings(),
    getHomepageContent(),
    getPublicCategories(),
    getPublicProducts(),
    getPublicProjects(),
    getPublicGallery(),
    getPublicTestimonials(),
    getActiveOfficeLocation(),
    getPublicHeroSlides(),
  ]);

  return (
    <PublicHome
      settings={settings}
      homepage={homepage}
      categories={categories}
      products={products}
      projects={projects}
      gallery={gallery}
      testimonials={testimonials}
      office={office}
      heroSlides={heroSlides}
    />
  );
}
