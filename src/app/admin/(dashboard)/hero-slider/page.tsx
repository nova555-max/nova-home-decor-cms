import { HeroSliderManager } from "@/components/admin/hero-slider-manager";
import { getHeroSliderData } from "@/lib/actions/hero-slides";

export default async function HeroSliderPage() {
  const initial = await getHeroSliderData();
  return <HeroSliderManager initial={initial} />;
}
