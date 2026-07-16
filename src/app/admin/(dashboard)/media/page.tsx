import { MediaLibraryManager } from "@/components/admin/media-library-manager";
import { getAdminMedia } from "@/lib/queries/cms";

export default async function AdminMediaPage() {
  const assets = await getAdminMedia();
  return <MediaLibraryManager assets={assets} />;
}
