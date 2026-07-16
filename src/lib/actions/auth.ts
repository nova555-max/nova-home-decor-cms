"use server";

import { env } from "@/config/env";
import {
  clearDevSession,
  createDevSession,
  isDevAuthEnabled,
  validateDevCredentials,
} from "@/lib/auth/dev-session";
import {
  generateOtpCode,
  hashOtpCode,
  isValidOtpFormat,
  otpHashesMatch,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "@/lib/auth/password-otp";
import {
  sendPasswordOtpEmail,
  isResendConfigured,
} from "@/lib/email/send-password-reset";
import {
  getAdminUserByAuthId,
  getAdminUserByEmail,
} from "@/lib/queries/admin-users";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

type ServiceClient = ReturnType<typeof createServiceClient>;

async function getServiceOrError(): Promise<
  { ok: true; service: ServiceClient } | { ok: false; error: string }
> {
  try {
    return { ok: true, service: createServiceClient() };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Service role key missing.";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        ok: false,
        error:
          "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable password reset.",
      };
    }
    return { ok: false, error: message };
  }
}

async function findAuthUserIdByEmail(
  service: ServiceClient,
  email: string,
): Promise<string | null> {
  const { data: profile } = await service
    .from("admin_users")
    .select("auth_user_id")
    .ilike("email", email)
    .maybeSingle();

  if (profile?.auth_user_id) {
    return profile.auth_user_id as string;
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error("[findAuthUserIdByEmail]", error.message);
      return null;
    }
    const users = data?.users ?? [];
    const found = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found?.id) return found.id;
    if (users.length < 200) break;
  }

  return null;
}

async function deleteOtpsForEmail(
  service: ServiceClient,
  email: string,
): Promise<void> {
  const { error } = await service
    .from("password_reset_otps")
    .delete()
    .ilike("email", email);
  if (error) {
    console.error("[deleteOtpsForEmail]", error.message);
  }
}

export async function signInAsAdmin(
  email: string,
  password: string,
): Promise<ActionResult> {
  if (isDevAuthEnabled()) {
    if (!validateDevCredentials(email, password)) {
      return {
        success: false,
        error:
          "Invalid email or password. Check DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD in .env.local, then restart the server.",
      };
    }
    await createDevSession();
    return { success: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const authUser = data.user;
  if (!authUser?.id || !authUser.email) {
    return { success: false, error: "Invalid login response." };
  }

  let profile = await getAdminUserByAuthId(authUser.id);

  if (!profile) {
    profile = await getAdminUserByEmail(authUser.email);
    if (profile?.auth_user_id && profile.auth_user_id !== authUser.id) {
      await supabase.auth.signOut();
      return { success: false, error: "Account is not linked correctly." };
    }
  }

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Access denied. Contact the administrator.",
    };
  }

  if (profile.auth_user_id !== authUser.id) {
    try {
      const service = createServiceClient();
      await service
        .from("admin_users")
        .update({ auth_user_id: authUser.id })
        .eq("id", profile.id);
    } catch {
      // Service role optional for relinking pre-created editor accounts.
    }
  }

  if (profile.email.toLowerCase() !== authUser.email.toLowerCase()) {
    try {
      const service = createServiceClient();
      await service
        .from("admin_users")
        .update({ email: authUser.email.toLowerCase() })
        .eq("id", profile.id);
    } catch {
      // Email sync is best-effort after verification.
    }
  }

  return { success: true };
}

export async function signInWithSuperAdmin(
  email: string,
  password: string,
): Promise<ActionResult> {
  return signInAsAdmin(email, password);
}

export async function forgotPassword(email: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return { success: false, error: "Email is required." };
  }

  if (!isResendConfigured()) {
    return {
      success: false,
      error: "Email service is not configured (RESEND_API_KEY).",
    };
  }

  const serviceResult = await getServiceOrError();
  if (!serviceResult.ok) {
    return { success: false, error: serviceResult.error };
  }
  const { service } = serviceResult;

  // Must use service role: anon/session client cannot read admin_users while logged out (RLS).
  const { data: profile, error: profileError } = await service
    .from("admin_users")
    .select("id, email, is_active, auth_user_id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profileError) {
    console.error("[forgotPassword] admin lookup", profileError.message);
    return { success: false, error: "Could not verify admin account." };
  }

  const isSuperAdminEmail =
    !!env.SUPER_ADMIN_EMAIL &&
    normalized === env.SUPER_ADMIN_EMAIL.toLowerCase();

  if (!isSuperAdminEmail && !profile?.is_active) {
    return { success: false, error: "Email not found." };
  }

  const authUserId = await findAuthUserIdByEmail(service, normalized);
  if (!authUserId) {
    return { success: false, error: "Email not found." };
  }

  const { data: recent } = await service
    .from("password_reset_otps")
    .select("last_sent_at")
    .ilike("email", normalized)
    .order("last_sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.last_sent_at) {
    const elapsed =
      Date.now() - new Date(recent.last_sent_at as string).getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSec} seconds before requesting another code.`,
      };
    }
  }

  const otp = generateOtpCode();
  const codeHash = hashOtpCode(otp, normalized);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await deleteOtpsForEmail(service, normalized);

  const { error: insertError } = await service.from("password_reset_otps").insert({
    email: normalized,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
    last_sent_at: now.toISOString(),
  });

  if (insertError) {
    console.error("[forgotPassword] insert otp", insertError.message);
    return { success: false, error: "Could not create verification code." };
  }

  const sent = await sendPasswordOtpEmail({ to: normalized, otp });
  if (!sent.ok) {
    console.error("[forgotPassword] resend", sent.error);
    await deleteOtpsForEmail(service, normalized);
    return {
      success: false,
      error: "Could not send verification code. Please try again.",
    };
  }

  return { success: true };
}

export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  password: string,
): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();
  const code = otp.trim();

  if (!normalized) {
    return { success: false, error: "Email is required." };
  }

  if (!isValidOtpFormat(code)) {
    return { success: false, error: "Invalid code." };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  const serviceResult = await getServiceOrError();
  if (!serviceResult.ok) {
    return { success: false, error: serviceResult.error };
  }
  const { service } = serviceResult;

  const { data: row, error: lookupError } = await service
    .from("password_reset_otps")
    .select("id, code_hash, expires_at")
    .ilike("email", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[resetPasswordWithOtp] lookup", lookupError.message);
    return { success: false, error: "Could not verify code." };
  }

  if (!row) {
    return { success: false, error: "Invalid code." };
  }

  const expiresAt = new Date(row.expires_at as string).getTime();
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    await deleteOtpsForEmail(service, normalized);
    return { success: false, error: "Expired code." };
  }

  const expectedHash = row.code_hash as string;
  const providedHash = hashOtpCode(code, normalized);
  if (!otpHashesMatch(expectedHash, providedHash)) {
    return { success: false, error: "Invalid code." };
  }

  const authUserId = await findAuthUserIdByEmail(service, normalized);
  if (!authUserId) {
    await deleteOtpsForEmail(service, normalized);
    return { success: false, error: "Email not found." };
  }

  const { error: updateError } = await service.auth.admin.updateUserById(
    authUserId,
    { password },
  );

  if (updateError) {
    console.error("[resetPasswordWithOtp] updateUser", updateError.message);
    return { success: false, error: "Could not update password." };
  }

  await deleteOtpsForEmail(service, normalized);
  return { success: true };
}

/** @deprecated Prefer resetPasswordWithOtp — session-based reset links are disabled. */
export async function resetPassword(_password: string): Promise<ActionResult> {
  return {
    success: false,
    error: "Use the verification code sent to your email to reset your password.",
  };
}

export async function signOut(): Promise<void> {
  if (isDevAuthEnabled()) {
    await clearDevSession();
    return;
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  if (isDevAuthEnabled()) {
    const email = process.env.DEV_ADMIN_EMAIL ?? env.SUPER_ADMIN_EMAIL ?? "";
    if (!validateDevCredentials(email, currentPassword)) {
      return { success: false, error: "Current password is incorrect." };
    }
    return {
      success: false,
      error:
        "Dev mode: update DEV_ADMIN_PASSWORD in .env.local to change password.",
    };
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
    return { success: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
