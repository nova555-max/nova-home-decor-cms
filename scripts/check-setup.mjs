import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const categoriesPath = path.join(root, ".data", "categories.json");

console.log("\n=== Nova Home Decor CMS — Setup Check ===\n");

if (!existsSync(envPath)) {
  console.log("❌ .env.local missing — copy from .env.example");
} else {
  const env = readFileSync(envPath, "utf8");
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
  const devAuth = env.includes("DEV_AUTH_ENABLED=true");

  const placeholder =
    !url ||
    url.includes("your-project") ||
    !key ||
    key.includes("your-anon-key");

  if (placeholder) {
    console.log("⚠️  Supabase: placeholder (dev local store active for categories)");
    console.log("   → Create project at https://supabase.com");
    console.log("   → Run migrations 001 → 004 → 005 in SQL Editor");
    console.log("   → Paste URL + anon key into .env.local");
  } else {
    console.log("✅ Supabase URL configured:", url);
  }

  if (devAuth) console.log("✅ Dev login enabled (localhost only)");
}

if (existsSync(categoriesPath)) {
  try {
    const items = JSON.parse(readFileSync(categoriesPath, "utf8"));
    const active = items.filter((c) => !c.deleted_at);
    console.log(`✅ Local categories (dev): ${active.length} item(s)`);
  } catch {
    console.log("⚠️  .data/categories.json unreadable");
  }
} else {
  console.log("ℹ️  No local categories file yet — add at /admin/categories");
}

console.log("\nMigrations order:");
console.log("  1. supabase/migrations/001_initial_schema.sql");
console.log("  2. supabase/migrations/002_cms_extensions.sql");
console.log("  3. supabase/migrations/003_premium_features.sql");
console.log("  4. supabase/migrations/004_premium_cms.sql");
console.log("  5. supabase/migrations/005_seed_categories.sql (optional)");

console.log("\nRun: npm run dev");
console.log("Admin: http://localhost:3000/admin/login");
console.log("Public: http://localhost:3000\n");
