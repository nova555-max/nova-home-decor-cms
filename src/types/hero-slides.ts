export type HeroSlide = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HeroSlideInput = {
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  display_order?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type HeroSlideUpdate = Partial<
  Omit<HeroSlideInput, "image_url"> & { image_url?: string }
>;

export const HERO_SLIDES_MAX = 10;
export const HERO_SLIDE_MAX_BYTES = 10 * 1024 * 1024;
/** Canonical MIME types accepted for hero slides (plus image/jpg alias at runtime). */
export const HERO_SLIDE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const HERO_SLIDE_ACCEPT_ATTR =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";
