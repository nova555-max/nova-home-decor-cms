"use client";

import { createClient } from "@/lib/supabase/client";

/** Refreshes the Supabase auth session from the browser (e.g. after JWT expiry). */
export async function refreshAuthSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch {
    return false;
  }
}
