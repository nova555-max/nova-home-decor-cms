import {
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "IQ";

/** Left-to-Right Isolate … Pop Directional Isolate — locks order inside RTL pages. */
const LRI = "\u2066";
const PDI = "\u2069";

export type NormalizedPhone = {
  /** Digits with leading +, e.g. +9647509941015 */
  e164: string;
  /** Display form, e.g. +964 750 994 1015 */
  display: string;
  /**
   * Display wrapped in Unicode isolates so RTL layouts cannot reverse digits.
   * Use this for text nodes; still set dir="ltr" on the container.
   */
  displayIsolated: string;
  /** tel: href value */
  telHref: string;
};

function withIsolate(display: string): string {
  return `${LRI}${display}${PDI}`;
}

function toResult(e164: string, display: string): NormalizedPhone {
  return {
    e164,
    display,
    displayIsolated: withIsolate(display),
    telHref: `tel:${e164}`,
  };
}

/** Normalize stored phone strings for react-phone-number-input (E.164 only). */
export function toPhoneInputValue(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | undefined {
  const normalized = normalizePhone(value, defaultCountry);
  return normalized?.e164;
}

/**
 * Parse / normalize any stored phone into E.164 + international display.
 * Handles missing +, local Iraq numbers, spaces, and RTL-corrupted strings.
 */
export function normalizePhone(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): NormalizedPhone | null {
  if (!value?.trim()) return null;

  // Strip bidi / formatting junk; keep leading + and digits.
  let raw = value
    .trim()
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[^\d+]/g, "");

  if (!raw) return null;

  // If someone stored digits reversed visually as "1015994750+964", fix + at end.
  if (!raw.startsWith("+") && raw.endsWith("+")) {
    raw = `+${raw.slice(0, -1)}`;
  }

  // Digits then country code at the end: 7509941015964 or 1015994750964
  raw = fixTrailingCountryCode(raw);

  // Multiple plus signs — keep first as country marker.
  if ((raw.match(/\+/g) ?? []).length > 1) {
    raw = `+${raw.replace(/\+/g, "")}`;
  }

  // Iraq local: 07XXXXXXXXX → +9647XXXXXXXXX
  if (!raw.startsWith("+") && /^0?7\d{9}$/.test(raw.replace(/\D/g, ""))) {
    const digits = raw.replace(/\D/g, "").replace(/^0/, "");
    raw = `+964${digits}`;
  }

  // Bare 10-digit Iraqi mobile without 0: 7XXXXXXXXX
  if (!raw.startsWith("+") && /^7\d{9}$/.test(raw.replace(/\D/g, ""))) {
    raw = `+964${raw.replace(/\D/g, "")}`;
  }

  // Digits starting with 964
  if (!raw.startsWith("+") && /^964\d{8,}$/.test(raw.replace(/\D/g, ""))) {
    raw = `+${raw.replace(/\D/g, "")}`;
  }

  try {
    if (isValidPhoneNumber(raw)) {
      const parsed = parsePhoneNumber(raw);
      if (parsed) {
        return toResult(parsed.number, formatIraqFriendly(parsed));
      }
    }

    const parsed = parsePhoneNumber(raw, defaultCountry);
    if (parsed?.isValid()) {
      return toResult(parsed.number, formatIraqFriendly(parsed));
    }
  } catch {
    // fall through
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;

  const e164 = `+${digits}`;
  return toResult(e164, formatDigitsInternational(e164));
}

function formatIraqFriendly(parsed: {
  number: string;
  formatInternational: () => string;
  countryCallingCode?: string;
}): string {
  const digits = parsed.number.replace(/\D/g, "");
  if (digits.startsWith("964") && digits.length === 13) {
    // +964 7XX XXX XXXX
    return `+964 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return parsed.formatInternational();
}

/**
 * Repair strings like "1015994750+964" or "1015994750964" (country code at end).
 */
function fixTrailingCountryCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // Explicit +964 at end already handled above via endsWith('+')
  // Pattern: national number + 964 (Iraq)
  if (!raw.startsWith("+") && digits.endsWith("964") && digits.length >= 12) {
    const national = digits.slice(0, -3);
    if (/^0?7\d{8,9}$/.test(national) || /^7\d{9}$/.test(national)) {
      const n = national.replace(/^0/, "");
      return `+964${n}`;
    }
  }

  // Bidi-reversed display stored as digits: 1015994750964
  // came from visual "1015 994 750 964" ← originally "+964 750 994 1015"
  if (!raw.startsWith("+") && digits.length === 13 && digits.endsWith("964")) {
    const body = digits.slice(0, -3);
    if (body.length === 10) {
      const a = body.slice(0, 4);
      const b = body.slice(4, 7);
      const c = body.slice(7, 10);
      const national = `${c}${b}${a}`;
      if (/^7\d{9}$/.test(national)) {
        return `+964${national}`;
      }
    }
  }

  return raw;
}

/** Pretty spacing for unknown-region numbers: +CCC XXX XXX XXXX */
function formatDigitsInternational(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("964") && digits.length >= 12) {
    return `+964 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.length <= 4) return `+${digits}`;
  const ccLen = digits.length > 10 ? 3 : 2;
  const cc = digits.slice(0, ccLen);
  const rest = digits.slice(ccLen);
  const groups = rest.match(/.{1,3}/g)?.join(" ") ?? rest;
  return `+${cc} ${groups}`;
}

/** Max phone numbers a business owner can save (stored comma-separated). */
export const MAX_PHONE_NUMBERS = 4;

/**
 * Split a stored phone field that may contain multiple numbers
 * (comma / semicolon / slash / newline separated).
 */
export function splitPhoneField(
  value: string | null | undefined,
): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;|/\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Unique normalized phones from one or more raw fields. */
export function collectPhones(
  ...fields: Array<string | null | undefined>
): NormalizedPhone[] {
  const seen = new Set<string>();
  const out: NormalizedPhone[] = [];

  for (const field of fields) {
    for (const part of splitPhoneField(field)) {
      const normalized = normalizePhone(part);
      if (!normalized || seen.has(normalized.e164)) continue;
      seen.add(normalized.e164);
      out.push(normalized);
    }
  }

  return out;
}

/** First valid number — for header / primary CTA call buttons. */
export function primaryPhone(
  value: string | null | undefined,
): NormalizedPhone | null {
  return collectPhones(value)[0] ?? null;
}

/** Persist up to MAX_PHONE_NUMBERS as a single settings field. */
export function serializePhoneList(
  phones: Array<string | null | undefined>,
): string | null {
  const list = collectPhones(...phones)
    .slice(0, MAX_PHONE_NUMBERS)
    .map((p) => p.e164);
  return list.length ? list.join(", ") : null;
}

/** Admin form slots: 1–4 inputs, padded for editing. */
export function phoneSlotsFromStored(
  value: string | null | undefined,
): string[] {
  const slots = splitPhoneField(value)
    .slice(0, MAX_PHONE_NUMBERS)
    .map((part) => toPhoneInputValue(part) ?? part);
  return slots.length ? slots : [""];
}

export function formatInternationalPhone(
  phone: string | null | undefined,
): string {
  return primaryPhone(phone)?.display ?? "";
}

export function phoneTelHref(phone: string | null | undefined): string | null {
  return primaryPhone(phone)?.telHref ?? null;
}

export function whatsappLink(number: string | null | undefined): string | null {
  const normalized = normalizePhone(number);
  if (!normalized) return null;
  const digits = normalized.e164.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
