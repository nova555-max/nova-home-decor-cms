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
  getRuntimeEnvSnapshot,
  logEnvDiagnostics,
} from "@/lib/env/runtime";
import {
  formatSupabaseOperationError,
  getSupabaseKeyMismatchDetail,
} from "@/lib/env/supabase-errors";
import {
  getAdminUserByAuthId,
  getAdminUserByEmail,
} from "@/lib/queries/admin-users";
import { normalizePermissions } from "@/lib/auth/permissions";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AdminUser } from "@/types/admin";

type ActionResult = { success: true } | { success: false; error: string };

type ServiceClient = ReturnType<typeof createServiceClient>;

function explainSupabaseAuthError(message: string): string {
  if (/Invalid API key/i.test(message)) {
    return (
      "Invalid API key — NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY) is wrong for this project, " +
      "or NEXT_PUBLIC_SUPABASE_URL points to a different Supabase project. " +
      "Use project zfsoeketfjnnpirglosq (same as your admin_users data). " +
      "Fix both in Netlify → Environment variables (Builds + Functions), then redeploy. Original: " +
      message
    );
  }
  if (/Invalid login credentials/i.test(message)) {
    const snap = getRuntimeEnvSnapshot();
    const url = snap.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (url && !url.includes("zfsoeketfjnnpirglosq")) {
      return (
        "Invalid email or password — and NEXT_PUBLIC_SUPABASE_URL is not the project that holds your users " +
        `(current: ${url}). Set it to https://zfsoeketfjnnpirglosq.supabase.co with matching anon + service keys, then redeploy.`
      );
    }
    return (
      "Invalid email or password for this Supabase project. " +
      "Use the password you set, or open Forgot password. " +
      "If Netlify still points at an old project, update NEXT_PUBLIC_SUPABASE_URL to zfsoeketfjnnpirglosq and redeploy."
    );
  }
  if (/Email not confirmed/i.test(message)) {
    return "Email is not confirmed in Supabase Auth. Confirm the user in Supabase → Authentication → Users.";
  }
  return message;
}

async function getServiceOrError(): Promise<
  { ok: true; service: ServiceClient } | { ok: false; error: string }
> {
  try {
    return { ok: true, service: createServiceClient() };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Service role key missing.";
    logEnvDiagnostics("[auth:service]");
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY") || /service_role/i.test(message)) {
      return {
        ok: false,
        error:
          message.includes("SUPABASE_SERVICE_ROLE_KEY")
            ? message
            : `SUPABASE_SERVICE_ROLE_KEY problem: ${message}`,
      };
    }
    return { ok: false, error: message };
  }
}

async function findAuthUserIdByEmail(
  service: ServiceClient,
  email: string,
): Promise<{ id: string | null; error?: string }> {
  const { data: profile, error: profileError } = await service
    .from("admin_users")
    .select("auth_user_id")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("[findAuthUserIdByEmail] profile", profileError.message);
  } else if (profile?.auth_user_id) {
    return { id: profile.auth_user_id as string };
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error("[findAuthUserIdByEmail]", error.message);
      return {
        id: null,
        error: formatSupabaseOperationError(
          "Auth admin listUsers",
          error.message,
        ),
      };
    }
    const users = data?.users ?? [];
    const found = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found?.id) return { id: found.id };
    if (users.length < 200) break;
  }

  return { id: null };
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

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.error("[signInAsAdmin] auth", error.message);
      return { success: false, error: explainSupabaseAuthError(error.message) };
    }

    const authUser = data.user;
    if (!authUser?.id || !authUser.email) {
      return { success: false, error: "Invalid login response from Supabase Auth." };
    }

    // Same client that just signed in (session in memory — avoids cookie race on Netlify).
    let profile: AdminUser | null = null;
    {
      const { data: ownRow, error: ownError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (ownError) {
        console.error("[signInAsAdmin] own profile", ownError.message);
      } else if (ownRow) {
        profile = {
          ...ownRow,
          permissions: normalizePermissions(ownRow.permissions),
        } as AdminUser;
      }
    }

    if (!profile) {
      profile = await getAdminUserByAuthId(authUser.id);
    }

    if (!profile) {
      profile = await getAdminUserByEmail(authUser.email);
      if (profile?.auth_user_id && profile.auth_user_id !== authUser.id) {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            "Admin profile auth_user_id does not match this login user. Relink in admin_users or recreate the admin.",
        };
      }
    }

    if (!profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Auth login succeeded, but admin profile could not be loaded. " +
          "SUPER_ADMIN_EMAIL alone is not enough — set SUPABASE_SERVICE_ROLE_KEY from the SAME Supabase project as NEXT_PUBLIC_SUPABASE_URL (zfsoeketfjnnpirglosq: secret sb_secret_… or service_role JWT), enable it for Builds + Functions, then redeploy. " +
          "Also open /api/health and check database/auth status.",
      };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "This admin account is disabled (is_active=false).",
      };
    }

    if (profile.auth_user_id !== authUser.id) {
      try {
        const service = createServiceClient();
        await service
          .from("admin_users")
          .update({ auth_user_id: authUser.id })
          .eq("id", profile.id);
      } catch (err) {
        console.error(
          "[signInAsAdmin] relink",
          err instanceof Error ? err.message : err,
        );
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed.";
    console.error("[signInAsAdmin]", message);
    if (/NEXT_PUBLIC_SUPABASE|not configured/i.test(message)) {
      logEnvDiagnostics("[signInAsAdmin]");
      return { success: false, error: message };
    }
    return { success: false, error: explainSupabaseAuthError(message) };
  }
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
    logEnvDiagnostics("[forgotPassword:resend]");
    return {
      success: false,
      error:
        "RESEND_API_KEY is missing. Add it under Netlify → Site configuration → Environment variables, then redeploy.",
    };
  }

  const snap = getRuntimeEnvSnapshot();
  if (snap.SUPER_ADMIN_EMAIL && normalized === snap.SUPER_ADMIN_EMAIL) {
    // Explicit path for configured super admin — still require Auth user.
  } else if (!snap.SUPER_ADMIN_EMAIL) {
    console.warn(
      "[forgotPassword] SUPER_ADMIN_EMAIL is not set; only active admin_users rows can reset.",
    );
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
    const mismatch = getSupabaseKeyMismatchDetail();
    if (mismatch) {
      return { success: false, error: mismatch };
    }
    return {
      success: false,
      error: formatSupabaseOperationError(
        "Could not verify admin account",
        profileError.message,
      ),
    };
  }

  const isSuperAdminEmail =
    !!snap.SUPER_ADMIN_EMAIL && normalized === snap.SUPER_ADMIN_EMAIL;

  if (!isSuperAdminEmail && !profile?.is_active) {
    return {
      success: false,
      error:
        `No active admin_users row for ${normalized}. ` +
        (snap.SUPER_ADMIN_EMAIL
          ? `Expected SUPER_ADMIN_EMAIL=${snap.SUPER_ADMIN_EMAIL}, or another registered admin.`
          : "Set SUPER_ADMIN_EMAIL or create the first admin at /admin/setup."),
    };
  }

  const authLookup = await findAuthUserIdByEmail(service, normalized);
  if (authLookup.error) {
    return { success: false, error: authLookup.error };
  }
  if (!authLookup.id) {
    return {
      success: false,
      error:
        `SUPER_ADMIN / admin email ${normalized} is not in Supabase Auth users. ` +
        "Create the user via /admin/setup or Supabase → Authentication → Users, then retry forgot password.",
    };
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
    return {
      success: false,
      error: `Could not create verification code in password_reset_otps: ${insertError.message}`,
    };
  }

  const sent = await sendPasswordOtpEmail({ to: normalized, otp });
  if (!sent.ok) {
    console.error("[forgotPassword] resend", sent.error);
    await deleteOtpsForEmail(service, normalized);
    return {
      success: false,
      error: `Resend failed: ${sent.error}`,
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
    return { success: false, error: "Invalid code format (expected 6 digits)." };
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
    return {
      success: false,
      error: `Could not verify code: ${lookupError.message}`,
    };
  }

  if (!row) {
    return { success: false, error: "Invalid or unknown verification code." };
  }

  const expiresAt = new Date(row.expires_at as string).getTime();
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    await deleteOtpsForEmail(service, normalized);
    return { success: false, error: "Expired verification code. Request a new one." };
  }

  const expectedHash = row.code_hash as string;
  const providedHash = hashOtpCode(code, normalized);
  if (!otpHashesMatch(expectedHash, providedHash)) {
    return { success: false, error: "Invalid verification code." };
  }

  const authLookup = await findAuthUserIdByEmail(service, normalized);
  if (authLookup.error) {
    return { success: false, error: authLookup.error };
  }
  if (!authLookup.id) {
    await deleteOtpsForEmail(service, normalized);
    return {
      success: false,
      error: `Email ${normalized} was not found in Supabase Auth users.`,
    };
  }

  const { error: updateError } = await service.auth.admin.updateUserById(
    authLookup.id,
    { password },
  );

  if (updateError) {
    console.error("[resetPasswordWithOtp] updateUser", updateError.message);
    return {
      success: false,
      error: `Could not update password via Auth admin API: ${updateError.message}`,
    };
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
