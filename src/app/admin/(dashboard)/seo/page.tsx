import { SeoForm } from "@/components/admin/seo-form";
import { getAdminSettings } from "@/lib/queries/cms";

export default async function AdminSeoPage() {
  const settings = await getAdminSettings();
  return <SeoForm settings={settings} />;
}
