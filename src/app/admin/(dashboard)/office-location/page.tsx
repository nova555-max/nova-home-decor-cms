import { OfficeLocationManager } from "@/components/admin/office-location-manager";
import { getOfficeLocationData } from "@/lib/actions/office-location";

export default async function OfficeLocationPage() {
  const initial = await getOfficeLocationData();

  return <OfficeLocationManager initial={initial} />;
}
