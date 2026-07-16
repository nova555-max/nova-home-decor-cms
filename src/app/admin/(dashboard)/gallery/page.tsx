import { GalleryManager } from "@/components/admin/gallery-manager";
import { getAdminGallery } from "@/lib/queries/cms";

export default async function AdminGalleryPage() {
  const items = await getAdminGallery();
  return <GalleryManager items={items} />;
}
