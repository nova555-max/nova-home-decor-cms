"use server";

import { env } from "@/config/env";
import type { Locale } from "@/config/site";
import { isDevAuthEnabled } from "@/lib/auth/dev-session";
import { changePassword as changePasswordAction } from "@/lib/actions/auth";
import {
  getAdminUserByAuthId,
  getAdminUserByEmail,
} from "@/lib/queries/admin-users";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  getPasswordChecks,
  isPasswordStrongEnough,
} from "@/lib/validation/password";
import type { AdminRole } from "@/types/admin";

export type AdminAccountProfile = {
  id: string;
  email: string;
  role: AdminRole;
  fullName: string | null;
  username: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  preferredLocale: Locale | null;
  preferredTheme: "light" | "dark" | "system" | null;
  twoFactorEnabled: boolean;
  lastSignInAt: string | null;
};

type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function getAdminAccountProfile(): Promise<AdminAccountProfile | null> {
  const ctx = await requireAdmin();

  if (isDevAuthEnabled()) {
    return {
      id: ctx.profileId,
      email: ctx.email,
      role: ctx.role,
      fullName: null,
      username: null,
      phone: null,
      profilePhotoUrl: null,
      preferredLocale: "ku",
      preferredTheme: "system",
      twoFactorEnabled: false,
      lastSignInAt: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select(
      "id, email, role, full_name, username, phone, profile_photo_url, preferred_locale, preferred_theme, two_factor_enabled",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    role: data.role as AdminRole,
    fullName: data.full_name,
    username: data.username,
    phone: data.phone,
    profilePhotoUrl: data.profile_photo_url,
    preferredLocale: (data.preferred_locale as Locale | null) ?? null,
    preferredTheme: (data.preferred_theme as AdminAccountProfile["preferredTheme"]) ?? null,
    twoFactorEnabled: Boolean(data.two_factor_enabled),
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

export async function updateAdminProfile(input: {
  fullName?: string;
  username?: string;
  phone?: string;
  profilePhotoUrl?: string | null;
  preferredLocale?: Locale;
  preferredTheme?: "light" | "dark" | "system";
}): Promise<ActionResult> {
  const ctx = await requireAdmin();

  if (isDevAuthEnabled()) {
    return {
      success: true,
      message: "Dev mode: profile preview saved locally in this session only.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const username = input.username?.trim() || null;
  if (username) {
    const taken = await getAdminUserByUsername(username, ctx.profileId);
    if (taken) {
      return { success: false, error: "USERNAME_TAKEN" };
    }
  }

  const { error } = await supabase
    .from("admin_users")
    .update({
      full_name: input.fullName?.trim() || null,
      username,
      phone: input.phone?.trim() || null,
      profile_photo_url: input.profilePhotoUrl ?? null,
      preferred_locale: input.preferredLocale ?? null,
      preferred_theme: input.preferredTheme ?? null,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "USERNAME_TAKEN" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, message: "PROFILE_UPDATED" };
}

export async function requestEmailChange(
  newEmail: string,
  currentPassword: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const normalized = newEmail.trim().toLowerCase();

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, error: "INVALID_EMAIL" };
  }

  if (normalized === ctx.email.toLowerCase()) {
    return { success: false, error: "SAME_EMAIL" };
  }

  if (isDevAuthEnabled()) {
    return {
      success: false,
      error: "Dev mode: email change requires Supabase Auth.",
    };
  }

  const existing = await getAdminUserByEmail(normalized);
  if (existing) {
    return { success: false, error: "EMAIL_TAKEN" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Not authenticated." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: "WRONG_PASSWORD" };
  }

  const { error } = await supabase.auth.updateUser(
    { email: normalized },
    {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin/profile`,
    },
  );

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { success: false, error: "EMAIL_TAKEN" };
    }
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "EMAIL_VERIFICATION_SENT",
  };
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ActionResult> {
  if (newPassword !== confirmPassword) {
    return { success: false, error: "PASSWORD_MISMATCH" };
  }

  const checks = getPasswordChecks(newPassword);
  if (!isPasswordStrongEnough(checks)) {
    return { success: false, error: "PASSWORD_WEAK" };
  }

  const result = await changePasswordAction(currentPassword, newPassword);
  if (!result.success) {
    if (result.error.toLowerCase().includes("incorrect")) {
      return { success: false, error: "WRONG_PASSWORD" };
    }
    return result;
  }

  return { success: true, message: "PASSWORD_UPDATED" };
}

export async function signOutAllDevices(): Promise<ActionResult> {
  const { signOut } = await import("@/lib/actions/auth");
  await signOut();
  return { success: true };
}

export async function saveThemePreference(
  theme: "light" | "dark" | "system",
): Promise<ActionResult> {
  const ctx = await requireAdmin();

  if (isDevAuthEnabled()) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("admin_users")
    .update({ preferred_theme: theme })
    .eq("auth_user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  void ctx;
  return { success: true };
}

async function getAdminUserByUsername(
  username: string,
  excludeId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .ilike("username", username)
    .neq("id", excludeId)
    .maybeSingle();

  return Boolean(data);
}
