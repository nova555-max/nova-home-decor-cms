import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serverActionOrigins(): string[] {
  const origins = new Set<string>([
    "localhost:3000",
    "127.0.0.1:3000",
    "localhost:3001",
    "127.0.0.1:3001",
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
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
