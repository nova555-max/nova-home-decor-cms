/**
 * Create super admin in Supabase Auth + admin_users profile.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: node scripts/create-super-admin.mjs
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

function loadEnv() {
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const email = env.SUPER_ADMIN_EMAIL;
const password = env.DEV_ADMIN_PASSWORD;
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !url || !serviceKey) {
  console.error(
    "Missing SUPER_ADMIN_EMAIL, DEV_ADMIN_PASSWORD, URL, or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing } = await supabase
  .from("admin_users")
  .select("id")
  .eq("email", email.toLowerCase())
  .maybeSingle();

if (existing) {
  console.log("Super admin profile already exists for", email);
  process.exit(0);
}

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (authError) {
  console.error("Auth error:", authError.message);
  process.exit(1);
}

const userId = authData.user?.id;
if (!userId) {
  console.error("No user id returned");
  process.exit(1);
}

const allPermissions = {
  dashboard: true,
  homepage: true,
  categories: true,
  products: true,
  projects: true,
  gallery: true,
  media: true,
  seo: true,
  trash: true,
  settings: true,
};

const { error: profileError } = await supabase.from("admin_users").insert({
  auth_user_id: userId,
  email: email.toLowerCase(),
  role: "super_admin",
  permissions: allPermissions,
  is_active: true,
});

if (profileError) {
  console.error("Profile error:", profileError.message);
  await supabase.auth.admin.deleteUser(userId);
  process.exit(1);
}

console.log("Super admin created:", email);
