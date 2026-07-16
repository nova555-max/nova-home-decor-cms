import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

/** Normalize stored phone strings for react-phone-number-input (E.164 only). */
export function toPhoneInputValue(
  value: string | null | undefined,
  defaultCountry: "IQ" | "US" = "IQ",
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    if (isValidPhoneNumber(trimmed)) return trimmed;

    const parsed = parsePhoneNumber(trimmed, defaultCountry);
    if (parsed?.isValid()) return parsed.number;
  } catch {
    // Partial or legacy formats — omit value prop to avoid library console errors.
  }

  return undefined;
}
