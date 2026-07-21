import { OfficeLocationManager } from "@/components/admin/office-location-manager";
import { getOfficeLocationData } from "@/lib/actions/office-location";
import { getWebsiteSettings } from "@/lib/queries/cms";

export default async function OfficeLocationPage() {
  const [initial, settings] = await Promise.all([
    getOfficeLocationData(),
    getWebsiteSettings(),
  ]);

  return (
    <OfficeLocationManager
      initial={initial}
      initialMapsUrl={settings?.google_maps_url ?? null}
    />
  );
}
