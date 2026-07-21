import { isValidPhoneNumber } from "libphonenumber-js";

import { MAX_PHONE_NUMBERS } from "@/lib/phone/e164";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true;
  try {
    return isValidPhoneNumber(phone);
  } catch {
    return false;
  }
}

export type ContactValidationError =
  | "phone_invalid"
  | "whatsapp_invalid"
  | "email_invalid"
  | "phone_limit";

export function validateContactFields(form: {
  phone_numbers?: string[];
  phone_number?: string;
  whatsapp_number: string;
  email_addresses: { email: string }[];
}): ContactValidationError | null {
  const phones =
    form.phone_numbers ??
    (form.phone_number?.trim() ? [form.phone_number] : []);

  if (phones.length > MAX_PHONE_NUMBERS) {
    return "phone_limit";
  }

  for (const phone of phones) {
    if (phone.trim() && !isValidPhone(phone)) {
      return "phone_invalid";
    }
  }

  if (form.whatsapp_number.trim() && !isValidPhone(form.whatsapp_number)) {
    return "whatsapp_invalid";
  }
  for (const entry of form.email_addresses) {
    if (entry.email.trim() && !isValidEmail(entry.email)) {
      return "email_invalid";
    }
  }
  return null;
}
