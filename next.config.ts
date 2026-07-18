import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Public env must be present at `next build` so the client bundle gets inlined
 * values. Set these in Cloudflare → Builds → Build variables and secrets
 * (and runtime Variables). No secrets are hardcoded here.
 */
const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim() || "",
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

  // Cloudflare workers.dev default host when APP_URL is unset at build time
  origins.add("nova-home-decor-cms.novahome756.workers.dev");

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
