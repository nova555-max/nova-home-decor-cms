import type { Metadata } from "next";

import { WishlistView } from "@/components/public/wishlist-view";
import {
  getPublicCategories,
  getPublicProducts,
  getWebsiteSettings,
} from "@/lib/queries/cms";

export const metadata: Metadata = {
  title: "Wishlist",
};

export const revalidate = 60;

export default async function WishlistPage() {
  const [settings, products, categories] = await Promise.all([
    getWebsiteSettings(),
    getPublicProducts(),
    getPublicCategories(),
  ]);

  return (
    <WishlistView
      settings={settings}
      products={products}
      categories={categories}
    />
  );
}
