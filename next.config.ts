import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

import { resolvePublicEnvWithDefaults } from "./src/config/public-env-defaults";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const publicEnv = resolvePublicEnvWithDefaults();

function addAllowedOrigin(origins: Set<string>, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;

  try {
    if (trimmed.includes("://")) {
      const url = new URL(trimmed);
      origins.add(`${url.protocol}//${url.host}`);
      return;
    }

    origins.add(`http://${trimmed}`);
    origins.add(`https://${trimmed}`);
  } catch {
    /* ignore invalid origin */
  }
}

function serverActionOrigins(): string[] {
  const origins = new Set<string>();

  for (const host of [
    "localhost:3000",
    "127.0.0.1:3000",
    "localhost:3001",
    "127.0.0.1:3001",
    "nova-home-decor-cms.novahome756.workers.dev",
  ]) {
    addAllowedOrigin(origins, host);
  }

  // Netlify site / deploy preview URLs (injected at build).
  addAllowedOrigin(origins, publicEnv.NEXT_PUBLIC_APP_URL);
  addAllowedOrigin(origins, process.env.URL ?? "");
  addAllowedOrigin(origins, process.env.DEPLOY_PRIME_URL ?? "");
  addAllowedOrigin(origins, process.env.DEPLOY_URL ?? "");

  return [...origins];
}

const isDockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: publicEnv.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE,
  },
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
