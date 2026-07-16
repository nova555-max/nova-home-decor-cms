import { NextResponse } from "next/server";

import { LOGIN_PATH } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/reset-password";

  if (!code) {
    return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=missing_code`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback]", error.message);
      return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=auth_callback`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(`${origin}${LOGIN_PATH}?error=auth_callback`);
  }
}
