import { SettingsForm } from "@/components/admin/settings-form";
import { getAdminSettings } from "@/lib/queries/cms";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  return <SettingsForm settings={settings} />;
}
