import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Public env must be present at `next build` so the client bundle gets inlined
 * values. Cloudflare Build variables are often empty; wrangler `vars` only
 * cover Worker runtime/SSR. Fallbacks keep production builds bootable.
 */
const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "https://nblnwcacdlafvgrxfldv.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "sb_publishable_q5BPT1JI_h9D3sZ855X3Iw_OI14rGW",
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://nova-home-decor-cms.novahome756.workers.dev",
  NEXT_PUBLIC_DEFAULT_LOCALE:
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim() || "ku",
};

function serverActionOrigins(): string[] {
  const origins = new Set<string>([
    "localhost:3000",
    "127.0.0.1:3000",
    "localhost:3001",
    "127.0.0.1:3001",
  ]);

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const host = new URL(appUrl).host;
      if (host) origins.add(host);
    } catch {
      /* ignore invalid URL at build time */
    }
  }

  return [...origins];
}

const isDockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  env: publicEnv,
  // Standalone is for Docker/VPS only. Cloudflare uses @opennextjs/cloudflare.
  ...(isDockerBuild ? { output: "standalone" as const } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins(),
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
};

export default nextConfig;

// Wrangler/miniflare init slows or blocks local CMS dev; enable only for Cloudflare preview.
const cloudflareDevEnabled =
  process.env.CLOUDFLARE_DEV === "1" ||
  process.env.npm_lifecycle_event?.includes("cloudflare") === true;

if (cloudflareDevEnabled) {
  void import("@opennextjs/cloudflare").then((mod) =>
    mod.initOpenNextCloudflareForDev(),
  );
}
