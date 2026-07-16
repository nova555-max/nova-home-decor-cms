import type { Metadata } from "next";

import { SearchView } from "@/components/public/search-view";
import {
  getPublicCategories,
  getPublicProducts,
  getWebsiteSettings,
} from "@/lib/queries/cms";

export const metadata: Metadata = {
  title: "Search",
};

export const revalidate = 60;

export default async function SearchPage() {
  const [settings, products, categories] = await Promise.all([
    getWebsiteSettings(),
    getPublicProducts(),
    getPublicCategories(),
  ]);

  return (
    <SearchView
      settings={settings}
      products={products}
      categories={categories}
    />
  );
}
