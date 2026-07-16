import { ProductsManager } from "@/components/admin/products-manager";
import {
  getAdminCategories,
  getAdminMedia,
  getAdminProducts,
} from "@/lib/queries/cms";

export default async function AdminProductsPage() {
  const [products, categories, mediaAssets] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
    getAdminMedia(),
  ]);

  return (
    <ProductsManager
      products={products}
      categories={categories}
      mediaAssets={mediaAssets}
    />
  );
}
