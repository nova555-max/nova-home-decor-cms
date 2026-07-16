import type { MetadataRoute } from "next";

import { env } from "@/config/env";
import {
  getPublicCategories,
  getPublicProducts,
  getPublicProjects,
} from "@/lib/queries/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL;
  const [products, categories, projects] = await Promise.all([
    getPublicProducts().catch(() => []),
    getPublicCategories().catch(() => []),
    getPublicProjects().catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  return [
    ...staticRoutes,
    ...products.map((p) => ({
      url: `${base}/#products`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${base}/#categories`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...projects.map((p) => ({
      url: `${base}/#projects`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
