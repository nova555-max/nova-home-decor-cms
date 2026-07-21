import { SettingsForm } from "@/components/admin/settings-form";
import { getHeroSliderData } from "@/lib/actions/hero-slides";
import { getAdminSettings } from "@/lib/queries/cms";

export default async function AdminSettingsPage() {
  const [settings, heroSlides] = await Promise.all([
    getAdminSettings(),
    getHeroSliderData(),
  ]);

  return <SettingsForm settings={settings} heroSlides={heroSlides} />;
}
