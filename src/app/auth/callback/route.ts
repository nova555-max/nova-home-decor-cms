import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { LOGIN_PATH } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "recovery",
  "invite",
  "magiclink",
  "email",
  "signup",
  "email_change",
]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = searchParams.get("next") ?? "/admin/reset-password";
  const safeNext = next.startsWith("/") ? next : "/admin/reset-password";

  try {
    const supabase = await createClient();

    if (tokenHash && typeParam && ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)) {
      const { error } = await supabase.auth.verifyOtp({
        type: typeParam as EmailOtpType,
        token_hash: tokenHash,
      });
      if (error) {
        console.error("[auth/callback] verifyOtp", error.message);
        return NextResponse.redirect(
          `${origin}${LOGIN_PATH}?error=auth_callback`,
        );
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCode", error.message);
        return NextResponse.redirect(
          `${origin}${LOGIN_PATH}?error=auth_callback`,
        );
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }

    return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=missing_code`);
  } catch (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=auth_callback`);
  }
}
