import type { Metadata } from "next";

import { ContentTextProvider } from "@/components/providers/content-text-provider";
import { PublicRealtimeProvider } from "@/components/public/realtime-provider";
import { PublicAiChat } from "@/components/public/public-ai-chat";
import { MobileBottomNav } from "@/components/public/mobile-bottom-nav";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import {
  isSectionPubliclyVisible,
  normalizeSectionManager,
} from "@/lib/homepage/section-registry";
import { setRequestContentOverrides } from "@/lib/i18n/cms-text";
import { getHomepageContent, getWebsiteSettings } from "@/lib/queries/cms";
import { getPublishedContentStrings } from "@/lib/queries/content";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWebsiteSettings();
  const title = settings?.seo_title ?? settings?.company_name ?? "Nova Home Decor";
  const description =
    settings?.seo_description ?? settings?.company_description ?? undefined;

  return {
    title,
    description,
    icons: settings?.favicon_url ? { icon: settings.favicon_url } : undefined,
    openGraph: settings?.og_image
      ? { images: [{ url: settings.og_image }] }
      : undefined,
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [published, homepage] = await Promise.all([
    getPublishedContentStrings(),
    getHomepageContent(),
  ]);
  setRequestContentOverrides(published);

  const manager = normalizeSectionManager(
    homepage?.section_manager,
    homepage?.section_visibility,
  );
  const aiSection = manager.sections.find(
    (section) => section.id === "ai_assistant" || section.type === "ai_assistant",
  );
  const showAiAssistant = aiSection
    ? isSectionPubliclyVisible(aiSection)
    : true;

  return (
    <ContentTextProvider overrides={published}>
      <PublicRealtimeProvider>
        {children}
        <MobileBottomNav />
        <PwaInstallBanner />
        {showAiAssistant ? <PublicAiChat /> : null}
      </PublicRealtimeProvider>
    </ContentTextProvider>
  );
}
