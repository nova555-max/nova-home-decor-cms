import type { SectionVisibility } from "@/types/database";
import type {
  HomepageSectionSetting,
  SectionManagerState,
  SectionRegistryEntry,
} from "@/types/homepage-sections";

export const SECTION_MANAGER_VERSION = 1;

/** Built-in homepage sections — add entries here for future sections. */
export const HOMEPAGE_SECTION_REGISTRY: SectionRegistryEntry[] = [
  { id: "hero", type: "hero", labelKey: "section_visibility.sections.hero", editHref: "/admin/homepage" },
  { id: "stats", type: "stats", labelKey: "section_visibility.sections.stats", editHref: "/admin/homepage" },
  { id: "why_choose_us", type: "why_choose_us", labelKey: "section_visibility.sections.why_us", editHref: "/admin/homepage" },
  { id: "products", type: "products", labelKey: "section_visibility.sections.products", editHref: "/admin/products" },
  { id: "categories", type: "categories", labelKey: "section_visibility.sections.categories", editHref: "/admin/categories" },
  { id: "gallery", type: "gallery", labelKey: "section_visibility.sections.gallery", editHref: "/admin/gallery" },
  { id: "projects", type: "projects", labelKey: "section_visibility.sections.projects", editHref: "/admin/projects" },
  { id: "about", type: "about", labelKey: "section_visibility.sections.about", editHref: "/admin/homepage" },
  { id: "testimonials", type: "testimonials", labelKey: "section_visibility.sections.testimonials", editHref: "/admin/homepage" },
  { id: "quote", type: "quote", labelKey: "section_visibility.sections.quote", editHref: "/admin/homepage" },
  { id: "contact", type: "contact", labelKey: "section_visibility.sections.contact", editHref: "/admin/settings" },
  { id: "contact_cta", type: "contact_cta", labelKey: "section_visibility.sections.contact_cta", editHref: "/admin/homepage" },
  { id: "ai_assistant", type: "ai_assistant", labelKey: "section_visibility.sections.ai_assistant", editHref: "/admin" },
  { id: "footer", type: "footer", labelKey: "section_visibility.sections.footer", editHref: "/admin/settings" },
];

const DEFAULT_ORDER = HOMEPAGE_SECTION_REGISTRY.map((entry, index) => ({
  ...entry,
  order: index,
}));

export function buildDefaultSectionManager(): SectionManagerState {
  return {
    version: SECTION_MANAGER_VERSION,
    sections: DEFAULT_ORDER.map((entry, index) => ({
      id: entry.id,
      type: entry.type,
      visible: true,
      enabled: true,
      locked: false,
      order: index,
      scheduled_publish_at: null,
      scheduled_unpublish_at: null,
    })),
  };
}

function legacyVisibilityToSections(
  visibility?: Partial<SectionVisibility> | null,
): Record<string, boolean> {
  if (!visibility) return {};
  return {
    hero: visibility.hero !== false,
    stats: visibility.stats !== false,
    why_choose_us: visibility.why_choose_us !== false,
    products:
      visibility.featured_products !== false ||
      visibility.latest_products !== false,
    categories: visibility.categories !== false,
    gallery: visibility.gallery !== false,
    projects: visibility.projects !== false,
    about: visibility.about !== false,
    testimonials: visibility.testimonials !== false,
    quote: visibility.quote !== false,
    contact: visibility.contact !== false,
    contact_cta: visibility.contact_cta !== false,
    ai_assistant: (visibility as Record<string, boolean | undefined>).ai_assistant !== false,
    footer: visibility.footer !== false,
  };
}

export function normalizeSectionManager(
  raw?: Partial<SectionManagerState> | null,
  legacyVisibility?: Partial<SectionVisibility> | null,
): SectionManagerState {
  const defaults = buildDefaultSectionManager();
  const legacy = legacyVisibilityToSections(legacyVisibility);
  const stored = new Map(
    (raw?.sections ?? []).map((section) => [section.id, section]),
  );

  const merged = defaults.sections.map((base) => {
    const saved = stored.get(base.id);
    const visible =
      saved?.visible ?? legacy[base.id] ?? base.visible;
    return {
      ...base,
      ...saved,
      id: base.id,
      type: saved?.type ?? base.type,
      visible,
      enabled: saved?.enabled ?? true,
      locked: saved?.locked ?? false,
      order: saved?.order ?? base.order,
      scheduled_publish_at: saved?.scheduled_publish_at ?? null,
      scheduled_unpublish_at: saved?.scheduled_unpublish_at ?? null,
    };
  });

  const customSections = (raw?.sections ?? []).filter(
    (section) =>
      section.is_custom &&
      !defaults.sections.some((base) => base.id === section.id),
  );

  const sections = [...merged, ...customSections].sort(
    (a, b) => a.order - b.order,
  );

  return {
    version: raw?.version ?? SECTION_MANAGER_VERSION,
    sections: sections.map((section, index) => ({ ...section, order: index })),
  };
}

export function deriveLegacyVisibility(
  manager: SectionManagerState,
): SectionVisibility {
  const map = Object.fromEntries(
    manager.sections.map((section) => [section.id, section.visible]),
  );

  const productsVisible = map.products !== false;

  return {
    hero: map.hero !== false,
    about: map.about !== false,
    categories: map.categories !== false,
    featured_products: productsVisible,
    latest_products: productsVisible,
    projects: map.projects !== false,
    gallery: map.gallery !== false,
    why_choose_us: map.why_choose_us !== false,
    testimonials: map.testimonials !== false,
    stats: map.stats !== false,
    quote: map.quote !== false,
    contact: map.contact !== false,
    contact_cta: map.contact_cta !== false,
    footer: map.footer !== false,
    ai_assistant: map.ai_assistant !== false,
  } as SectionVisibility;
}

export function isSectionPubliclyVisible(
  section: HomepageSectionSetting,
  at: Date = new Date(),
): boolean {
  if (!section.enabled || !section.visible) return false;

  const now = at.getTime();
  if (section.scheduled_publish_at) {
    const publishAt = new Date(section.scheduled_publish_at).getTime();
    if (!Number.isNaN(publishAt) && now < publishAt) return false;
  }
  if (section.scheduled_unpublish_at) {
    const unpublishAt = new Date(section.scheduled_unpublish_at).getTime();
    if (!Number.isNaN(unpublishAt) && now >= unpublishAt) return false;
  }

  return true;
}

export function getOrderedPublicSections(
  manager: SectionManagerState,
  at: Date = new Date(),
): HomepageSectionSetting[] {
  return [...manager.sections]
    .sort((a, b) => a.order - b.order)
    .filter((section) => isSectionPubliclyVisible(section, at));
}

export function duplicateSectionSetting(
  manager: SectionManagerState,
  sectionId: string,
): SectionManagerState | null {
  const source = manager.sections.find((section) => section.id === sectionId);
  if (!source) return null;

  const copyId = `${source.type}_copy_${Date.now().toString(36)}`;
  const maxOrder = Math.max(...manager.sections.map((section) => section.order), 0);

  const copy: HomepageSectionSetting = {
    ...source,
    id: copyId,
    type: source.type,
    label: source.label ? `${source.label} (copy)` : undefined,
    visible: false,
    enabled: true,
    locked: false,
    order: maxOrder + 1,
    scheduled_publish_at: null,
    scheduled_unpublish_at: null,
    duplicated_from: source.id,
    is_custom: true,
  };

  return {
    ...manager,
    sections: [...manager.sections, copy].map((section, index) => ({
      ...section,
      order: index,
    })),
  };
}

export function resetSectionToDefault(
  manager: SectionManagerState,
  sectionId: string,
): SectionManagerState {
  const defaults = buildDefaultSectionManager();
  const defaultSection = defaults.sections.find(
    (section) => section.id === sectionId,
  );
  if (!defaultSection) return manager;

  return {
    ...manager,
    sections: manager.sections.map((section) =>
      section.id === sectionId
        ? {
            ...defaultSection,
            order: section.order,
          }
        : section,
    ),
  };
}

export function getRegistryEntry(sectionId: string): SectionRegistryEntry | undefined {
  return HOMEPAGE_SECTION_REGISTRY.find((entry) => entry.id === sectionId);
}
