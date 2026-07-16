import { CategoriesManager } from "@/components/admin/categories-manager";
import { getAdminCategories } from "@/lib/queries/cms";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return <CategoriesManager categories={categories} />;
}
