import {
  formatInternationalPhone,
  whatsappLink,
  normalizePhone,
  phoneTelHref,
  collectPhones,
} from "@/lib/phone/e164";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Safe slug for Kurdish/Arabic/English names — never returns empty */
export function createEntitySlug(text: string, prefix = "item"): string {
  const latin = slugify(text);
  if (latin) return latin;

  const unicode = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (unicode) return unicode;
  return `${prefix}-${Date.now().toString(36)}`;
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export {
  formatInternationalPhone,
  whatsappLink,
  normalizePhone,
  phoneTelHref,
  collectPhones,
};
