import { createHash, randomInt, timingSafeEqual } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Max wrong OTP attempts before the code is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;

function otpPepper(): string {
  const pepper =
    process.env.OTP_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!pepper) {
    throw new Error(
      "OTP_PEPPER (or SUPABASE_SERVICE_ROLE_KEY) must be set for password-reset OTP hashing.",
    );
  }
  return pepper;
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
