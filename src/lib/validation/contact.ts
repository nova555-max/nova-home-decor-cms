import { isValidPhoneNumber } from "libphonenumber-js";

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
  | "email_invalid";

export function validateContactFields(form: {
  phone_number: string;
  whatsapp_number: string;
  email_addresses: { email: string }[];
}): ContactValidationError | null {
  if (form.phone_number.trim() && !isValidPhone(form.phone_number)) {
    return "phone_invalid";
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
