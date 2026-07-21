import {
  decodeJwtPayload,
  getRuntimeEnvSnapshot,
} from "@/lib/env/runtime";

export type SupabaseFailureKind =
  | "missing_env"
  | "invalid_key"
  | "key_mismatch"
  | "dns"
  | "network"
  | "rls"
  | "unknown";

export function classifySupabaseError(message: string): SupabaseFailureKind {
  if (/1016|Could not resolve|ENOTFOUND|getaddrinfo|NXDOMAIN/i.test(message)) {
    return "dns";
  }
  if (/Invalid API key|JWT|apikey|invalid.*key/i.test(message)) {
    return "invalid_key";
  }
  if (/permission denied|row-level security|RLS|policy/i.test(message)) {
    return "rls";
  }
  if (/fetch failed|network|timeout|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return "network";
  }
  return "unknown";
}

export function getSupabaseKeyMismatchDetail(): string | null {
  const snap = getRuntimeEnvSnapshot();
  const anonKey = snap.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = snap.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey?.startsWith("eyJ")) {
    return null;
  }

  const serviceRef = decodeJwtPayload(serviceKey)?.ref;
  if (typeof serviceRef !== "string") return null;

  if (anonKey?.startsWith("eyJ")) {
    const anonRef = decodeJwtPayload(anonKey)?.ref;
    if (
      typeof anonRef === "string" &&
      anonRef.toLowerCase() !== serviceRef.toLowerCase()
    ) {
      return (
        `Key mismatch: anon JWT ref="${anonRef}" but service_role ref="${serviceRef}". ` +
        "Both keys must come from the same Supabase project."
      );
    }
  }

  try {
    const host = new URL(snap.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    const urlRef = match?.[1]?.toLowerCase();
    if (urlRef && urlRef !== serviceRef.toLowerCase()) {
      return (
        `URL/project mismatch: NEXT_PUBLIC_SUPABASE_URL ref="${urlRef}" but ` +
        `service_role ref="${serviceRef}". Use the same Supabase project.`
      );
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function formatSupabaseOperationError(
  operation: string,
  rawMessage: string,
): string {
  const kind = classifySupabaseError(rawMessage);
  const snap = getRuntimeEnvSnapshot();
  const mismatch = getSupabaseKeyMismatchDetail();

  if (kind === "dns") {
    return (
      `${operation} failed: cannot reach Supabase (Cloudflare error 1016 / DNS). ` +
      `Set NEXT_PUBLIC_SUPABASE_URL to https://YOUR-PROJECT.supabase.co ` +
      `(current resolved URL: ${snap.NEXT_PUBLIC_SUPABASE_URL ?? "missing"}). ` +
      "Confirm the URL matches your Supabase project Settings → API, then redeploy."
    );
  }

  if (kind === "invalid_key") {
    const hint = mismatch
      ? mismatch
      : `Verify NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in Netlify → Environment variables.`;
    return `${operation} failed: Invalid API key. ${hint} Original: ${rawMessage}`;
  }

  if (kind === "key_mismatch" || mismatch) {
    return `${operation} failed: ${mismatch ?? rawMessage}`;
  }

  if (kind === "rls") {
    return (
      `${operation} failed: Row Level Security blocked the query. ` +
      "Server actions that need admin_users while logged out must use SUPABASE_SERVICE_ROLE_KEY. " +
      `Original: ${rawMessage}`
    );
  }

  if (kind === "network") {
    return (
      `${operation} failed: network error reaching Supabase. ` +
      `URL=${snap.NEXT_PUBLIC_SUPABASE_URL ?? "missing"}. Original: ${rawMessage}`
    );
  }

  return `${operation} failed: ${rawMessage}`;
}
