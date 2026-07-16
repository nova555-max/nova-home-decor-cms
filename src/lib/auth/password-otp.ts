import { createHash, randomInt, timingSafeEqual } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function otpPepper(): string {
  return (
    process.env.OTP_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "nova-home-decor-otp"
  );
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, "0");
}

export function hashOtpCode(code: string, email: string): string {
  return createHash("sha256")
    .update(`${code.trim()}:${email.trim().toLowerCase()}:${otpPepper()}`)
    .digest("hex");
}

export function otpHashesMatch(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isValidOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
