import { ShowroomQrManager } from "@/components/admin/showroom-qr-manager";
import { getWebsiteSettings } from "@/lib/queries/cms";

export default async function AdminBarcodesPage() {
  const settings = await getWebsiteSettings();
  return <ShowroomQrManager settings={settings} />;
}
