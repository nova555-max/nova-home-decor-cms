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
  if (isDevAuthEnabled()) {
    return {
      success: false,
      error: "Dev mode: password reset is disabled. Contact the administrator.",
    };
  }

  const normalized = email.trim().toLowerCase();
  const profile = await getAdminUserByEmail(normalized);
  if (!profile?.is_active) {
    return { success: true };
  }

  if (!isResendConfigured()) {
    return {
      success: false,
      error: "Email service is not configured (RESEND_API_KEY).",
    };
  }

  try {
    const service = createServiceClient();
    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email: normalized,
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin/reset-password`,
      },
    });

    const resetLink = data?.properties?.action_link;
    if (error || !resetLink) {
      return {
        success: false,
        error: error?.message ?? "Could not generate password reset link.",
      };
    }

    const sent = await sendPasswordResetEmail({
      to: normalized,
      resetLink,
    });

    if (!sent.ok) {
      return { success: false, error: sent.error };
    }

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not send reset email.";
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
