import { CategoryBarcodesManager } from "@/components/admin/category-barcodes-manager";
import { getAdminCategories, getWebsiteSettings } from "@/lib/queries/cms";

export default async function AdminBarcodesPage() {
  const [categories, settings] = await Promise.all([
    getAdminCategories(),
    getWebsiteSettings(),
  ]);

  return (
    <CategoryBarcodesManager categories={categories} settings={settings} />
  );
}
