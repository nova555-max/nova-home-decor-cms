import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

import { resolvePublicEnvWithDefaults } from "./src/config/public-env-defaults";
import { CONTENT_SECURITY_POLICY } from "./src/lib/security/csp";

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
  ]) {
    addAllowedOrigin(origins, host);
  }

  addAllowedOrigin(origins, publicEnv.NEXT_PUBLIC_APP_URL);
  addAllowedOrigin(origins, process.env.URL ?? "");
  addAllowedOrigin(origins, process.env.DEPLOY_PRIME_URL ?? "");
  addAllowedOrigin(origins, process.env.DEPLOY_URL ?? "");
  addAllowedOrigin(origins, "https://nova-home-decor.com");
  addAllowedOrigin(origins, "https://www.nova-home-decor.com");
  addAllowedOrigin(origins, "https://timely-klepon-1dc4f9.netlify.app");
  addAllowedOrigin(
    origins,
    "https://nova-home-decor-cms.novahome756.workers.dev",
  );

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
      // Hero slides allow up to 10MB; default ~1MB caused
      // "An unexpected response was received from the server."
      bodySizeLimit: "12mb",
      allowedOrigins: serverActionOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
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
