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
  OTP_MAX_ATTEMPTS,
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
    console.error("[auth] Invalid API key", message);
    return "Sign-in is misconfigured. Contact the site administrator.";
  }
  if (/Invalid login credentials/i.test(message)) {
    return "Invalid email or password.";
  }
  if (/Email not confirmed/i.test(message)) {
    return "Email is not confirmed. Contact the site administrator.";
  }
  return "Could not sign in. Please try again.";
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
  const genericSuccess: ActionResult = { success: true };
  const genericClientError =
    "If an admin account exists for that email, a verification code was sent.";

  if (!normalized) {
    return { success: false, error: "Email is required." };
  }

  if (!isResendConfigured()) {
    logEnvDiagnostics("[forgotPassword:resend]");
    console.error("[forgotPassword] RESEND_API_KEY missing");
    return {
      success: false,
      error: "Password reset is temporarily unavailable. Contact support.",
    };
  }

  const snap = getRuntimeEnvSnapshot();
  const serviceResult = await getServiceOrError();
  if (!serviceResult.ok) {
    console.error("[forgotPassword] service", serviceResult.error);
    return {
      success: false,
      error: "Password reset is temporarily unavailable. Contact support.",
    };
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
    return {
      success: false,
      error: "Password reset is temporarily unavailable. Contact support.",
    };
  }

  const isSuperAdminEmail =
    !!snap.SUPER_ADMIN_EMAIL && normalized === snap.SUPER_ADMIN_EMAIL;

  if (!isSuperAdminEmail && !profile?.is_active) {
    // Do not reveal whether the email exists.
    return genericSuccess;
  }

  const authLookup = await findAuthUserIdByEmail(service, normalized);
  if (authLookup.error || !authLookup.id) {
    console.error(
      "[forgotPassword] auth lookup",
      authLookup.error ?? "missing auth user",
    );
    return genericSuccess;
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
  let codeHash: string;
  try {
    codeHash = hashOtpCode(otp, normalized);
  } catch (err) {
    console.error("[forgotPassword] otp pepper", err);
    return {
      success: false,
      error: "Password reset is temporarily unavailable. Contact support.",
    };
  }
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
      error: "Password reset is temporarily unavailable. Contact support.",
    };
  }

  const sent = await sendPasswordOtpEmail({ to: normalized, otp });
  if (!sent.ok) {
    console.error("[forgotPassword] resend", sent.error);
    await deleteOtpsForEmail(service, normalized);
    return {
      success: false,
      error: "Password reset is temporarily unavailable. Contact support.",
    };
  }

  // Keep success shape; UI may show genericClientError copy.
  void genericClientError;
  return genericSuccess;
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
    .select("id, code_hash, expires_at, attempt_count")
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

  const attempts = Number(row.attempt_count ?? 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await deleteOtpsForEmail(service, normalized);
    return {
      success: false,
      error: "Too many invalid attempts. Request a new verification code.",
    };
  }

  const expiresAt = new Date(row.expires_at as string).getTime();
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    await deleteOtpsForEmail(service, normalized);
    return { success: false, error: "Expired verification code. Request a new one." };
  }

  const expectedHash = row.code_hash as string;
  let providedHash: string;
  try {
    providedHash = hashOtpCode(code, normalized);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "OTP hashing is not configured.",
    };
  }
  if (!otpHashesMatch(expectedHash, providedHash)) {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await deleteOtpsForEmail(service, normalized);
      return {
        success: false,
        error: "Too many invalid attempts. Request a new verification code.",
      };
    }
    await service
      .from("password_reset_otps")
      .update({ attempt_count: nextAttempts })
      .eq("id", row.id as string);
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
