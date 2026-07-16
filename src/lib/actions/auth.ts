"use server";

import { env } from "@/config/env";
import {
  clearDevSession,
  createDevSession,
  isDevAuthEnabled,
  validateDevCredentials,
} from "@/lib/auth/dev-session";
import {
  sendPasswordResetEmail,
  isResendConfigured,
} from "@/lib/email/send-password-reset";
import {
  ensureSuperAdminProfile,
  getAdminUserByAuthId,
  getAdminUserByEmail,
} from "@/lib/queries/admin-users";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

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

  if (
    !profile &&
    env.SUPER_ADMIN_EMAIL &&
    authUser.email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    try {
      profile = await ensureSuperAdminProfile(authUser.id, authUser.email);
    } catch (err) {
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not create admin profile.",
      };
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

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Service role key missing.";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        success: false,
        error:
          "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable password reset emails.",
      };
    }
    return { success: false, error: message };
  }

  // Must use service role: anon/session client cannot read admin_users while logged out (RLS).
  const { data: profile, error: profileError } = await service
    .from("admin_users")
    .select("id, email, is_active")
    .ilike("email", normalized)
    .maybeSingle();

  if (profileError) {
    console.error("[forgotPassword] admin lookup", profileError.message);
    return { success: false, error: "Could not verify admin account." };
  }

  const isSuperAdminEmail =
    !!env.SUPER_ADMIN_EMAIL &&
    normalized === env.SUPER_ADMIN_EMAIL.toLowerCase();

  // Unknown / inactive emails: succeed silently (do not reveal account existence).
  if (!isSuperAdminEmail && !profile?.is_active) {
    return { success: true };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const redirectTo = `${appUrl}/auth/callback?next=/admin/reset-password`;

  try {
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email: normalized,
      options: { redirectTo },
    });

    if (error) {
      console.error("[forgotPassword] generateLink", error.message);
      // User may not exist in Supabase Auth yet (e.g. only DEV_AUTH credentials).
      return {
        success: false,
        error:
          error.message.includes("User not found") ||
          error.status === 404
            ? "No auth account found for this email. Sign in once with Supabase Auth, or create the user in Supabase → Authentication."
            : error.message,
      };
    }

    const hashedToken = data?.properties?.hashed_token;
    const actionLink = data?.properties?.action_link;

    // Prefer app-hosted verify (sets SSR cookies via verifyOtp). Fall back to Supabase action_link.
    const resetLink = hashedToken
      ? `${appUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent("/admin/reset-password")}`
      : actionLink;

    if (!resetLink) {
      return {
        success: false,
        error: "Could not generate password reset link.",
      };
    }

    const sent = await sendPasswordResetEmail({
      to: normalized,
      resetLink,
    });

    if (!sent.ok) {
      console.error("[forgotPassword] resend", sent.error);
      return { success: false, error: sent.error };
    }

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not send reset email.";
    console.error("[forgotPassword]", message);
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        success: false,
        error:
          "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable password reset emails.",
      };
    }
    return { success: false, error: message };
  }
}

export async function resetPassword(password: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Session expired. Request a new reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
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
