import { HomepageEditor } from "@/components/admin/homepage-editor";
import { getAdminHomepage, getAdminTestimonials } from "@/lib/queries/cms";

export default async function AdminHomepagePage() {
  const [homepage, testimonials] = await Promise.all([
    getAdminHomepage(),
    getAdminTestimonials(),
  ]);

  return <HomepageEditor homepage={homepage} testimonials={testimonials} />;
}
