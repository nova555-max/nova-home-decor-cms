/** Canonical homepage section identifiers (extensible for future sections). */
export type HomepageSectionId = string;

export type HomepageSectionSetting = {
  id: HomepageSectionId;
  /** Base renderer type (hero, stats, products, …). */
  type: string;
  label?: string;
  /** Show on the public website when enabled and scheduled. */
  visible: boolean;
  /** When false the section is disabled in CMS controls. */
  enabled: boolean;
  /** Prevent accidental edits to this section's settings. */
  locked: boolean;
  order: number;
  scheduled_publish_at: string | null;
  scheduled_unpublish_at: string | null;
  duplicated_from?: string | null;
  is_custom?: boolean;
};

export type SectionManagerState = {
  sections: HomepageSectionSetting[];
  version: number;
};

export type SectionRegistryEntry = {
  id: HomepageSectionId;
  type: string;
  labelKey: string;
  descriptionKey?: string;
  /** Route or anchor for preview / edit in CMS. */
  editHref?: string;
};
