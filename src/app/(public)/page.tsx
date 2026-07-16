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
  ] = await Promise.all([
    getWebsiteSettings(),
    getHomepageContent(),
    getPublicCategories(),
    getPublicProducts(),
    getPublicProjects(),
    getPublicGallery(),
    getPublicTestimonials(),
    getActiveOfficeLocation(),
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
    />
  );
}
