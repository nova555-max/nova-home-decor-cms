import { ShowroomQrManager } from "@/components/admin/showroom-qr-manager";
import { getAdminCategories, getWebsiteSettings } from "@/lib/queries/cms";

export default async function AdminBarcodesPage() {
  const [categories, settings] = await Promise.all([
    getAdminCategories(),
    getWebsiteSettings(),
  ]);

  return <ShowroomQrManager categories={categories} settings={settings} />;
}
