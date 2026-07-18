import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Public env for Next client bundle. Prefer Cloudflare Build variables;
 * fallbacks match wrangler.jsonc so Workers Builds still inline correctly.
 * Secrets are never hardcoded here.
 */
const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "https://znsoeketfjnnpirglosq.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmc29la2V0ZmpubnBpcmdsb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjI1NjAsImV4cCI6MjA5OTUzODU2MH0.1bpzOD3aOGz88h-C_pPtUopWPcMYW3b2OxR2t-ioc40",
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
    "nova-home-decor-cms.novahome756.workers.dev",
  ]);

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const host = new URL(appUrl).host;
      if (host) origins.add(host);
    } catch {
      /* ignore */
    }
  }

  return [...origins];
}

const isDockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  env: publicEnv,
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

const cloudflareDevEnabled =
  process.env.CLOUDFLARE_DEV === "1" ||
  process.env.npm_lifecycle_event?.includes("cloudflare") === true;

if (cloudflareDevEnabled) {
  void import("@opennextjs/cloudflare").then((mod) =>
    mod.initOpenNextCloudflareForDev(),
  );
}
