import type {
  Category,
  GalleryItem,
  Product,
  Project,
  WebsiteSettings,
} from "@/types/database";

export type DashboardStats = {
  categories: number;
  products: number;
  projects: number;
  gallery: number;
  featuredProducts: number;
  publishedProducts: number;
  hiddenProducts: number;
  visitors: number;
};

export type SystemStatus = {
  supabaseConnected: boolean;
  storageConnected: boolean;
  databaseHealthy: boolean;
  websiteOnline: boolean;
};

export type ActivityType =
  | "product_created"
  | "product_updated"
  | "category_updated"
  | "gallery_uploaded"
  | "settings_changed";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  entityName: string;
  timestamp: string;
};

export type SearchItem = {
  id: string;
  type: "product" | "category" | "project" | "gallery";
  title: string;
  subtitle?: string;
  href: string;
};

export type DashboardData = {
  stats: DashboardStats;
  recentProducts: Product[];
  recentProjects: Project[];
  recentGallery: GalleryItem[];
  activity: ActivityItem[];
  systemStatus: SystemStatus;
  settings: WebsiteSettings | null;
  searchItems: SearchItem[];
  categories: Category[];
};
