import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter config.
 * R2 incremental cache can be enabled later — see docs/CLOUDFLARE-DEPLOY.md.
 *
 * buildCommand must call Next.js directly (not `npm run build`).
 * Cloudflare Workers Builds uses `npm run build` → `opennextjs-cloudflare build`,
 * and OpenNext would recurse forever if it invoked `npm run build` again.
 */
export default {
  ...defineCloudflareConfig({}),
  buildCommand: "npx next build",
};
