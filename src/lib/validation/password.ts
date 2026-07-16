export type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordStrongEnough(checks: PasswordChecks): boolean {
  return Object.values(checks).every(Boolean);
}

export function getPasswordStrengthScore(checks: PasswordChecks): number {
  return Object.values(checks).filter(Boolean).length;
}

export function getPasswordStrengthLabel(score: number): "weak" | "fair" | "good" | "strong" {
  if (score <= 2) return "weak";
  if (score === 3) return "fair";
  if (score === 4) return "good";
  return "strong";
}
