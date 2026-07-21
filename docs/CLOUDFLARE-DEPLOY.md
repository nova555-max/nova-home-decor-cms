# Cloudflare Pages / Workers Deployment Guide

**Project:** Nova Home Decor CMS  
**Framework:** Next.js 15.5.20 (App Router)  
**Adapter:** [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) v1.x  
**Runtime:** Cloudflare Workers with `nodejs_compat`

> **Important:** This is a full-stack CMS (SSR, API routes, middleware, server actions). It **cannot** be deployed as a static site. Use **OpenNext + Cloudflare Workers** (via Pages Git integration or `wrangler deploy`).

---

## What Was Changed (Deployment Only)

| Change | Why |
|--------|-----|
| Added `@opennextjs/cloudflare` + `wrangler` | Official adapter for Next.js 15 on Cloudflare |
| Added `wrangler.jsonc` | Worker entry, assets, `nodejs_compat`, Images binding |
| Added `open-next.config.ts` | OpenNext Cloudflare configuration |
| Added `public/_headers` | Long-cache headers for `/_next/static/*` |
| Added `.node-version` (20) | Pin Node.js for CI / Workers Builds |
| Updated `next.config.ts` | `initOpenNextCloudflareForDev()`, conditional `standalone` for Docker only, production `serverActions.allowedOrigins` |
| Updated `package.json` scripts | `build` = OpenNext; `build:next` / `build:docker` for plain Next.js |
| Updated `Dockerfile` | `DOCKER_BUILD=1` preserves Docker standalone builds |
| Updated `.env.production.example` | Complete production env var list |
| Excluded `scripts/` from `tsconfig` | Fixes build typecheck on CLI scripts |
| Fixed `homepage-editor.tsx` TS error | Unblocks zero-error production build |

**Not changed:** UI, business logic, CMS features, Supabase schema, or route URLs.

---

## Cloudflare Pages — Exact Deployment Steps

### 1. Prerequisites

- Cloudflare account with Workers enabled
- Supabase project (URL, anon key, **service role key**)
- Resend API key (password reset emails)
- Google Gemini API key (AI chat)
- Google Maps API key (optional — admin map picker)
- Custom domain (optional)

### 2. Connect Repository

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select this repository and branch (e.g. `main`)

### 3. Build Settings

| Setting | Value |
|---------|-------|
| **Framework preset** | None (or Next.js if offered — verify command below) |
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| **Build output directory** | `.open-next` *(Wrangler uses worker bundle inside)* |
| **Root directory** | `/` (or `nova-home-decor-cms` if monorepo) |
| **Node.js version** | `20` (Cloudflare Workers Builds default) |

`npm run build` runs `opennextjs-cloudflare build`. OpenNext then runs `npx next build`
(via `buildCommand` in `open-next.config.ts`) so there is no infinite loop.

For **Workers Builds** (recommended for OpenNext):

```bash
npm ci
npm run build
npx wrangler deploy
```

This creates `.open-next/worker.js` for the deploy step.

Or locally after configuring secrets:

```bash
npm run deploy:cloudflare
```

### 4. Environment Variables (Production)

Cloudflare Workers Builds uses **two** env sections. Missing build-time vars causes `Invalid environment variables` during `next build`.

| Section | When used | What to put there |
|---------|-----------|-------------------|
| **Settings → Builds → Build variables and secrets** | During `npm run build` / OpenNext build | All `NEXT_PUBLIC_*` required by Next.js (inlined at build time) |
| **Settings → Variables and Secrets** | At Worker runtime | Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `GEMINI_API_KEY`, etc.) |

`NEXT_PUBLIC_SUPABASE_URL` must be the project root only — **not** `/rest/v1/`:

```text
https://YOUR-PROJECT.supabase.co
```

**Wrangler:** pin `wrangler@4.86.0` in `package.json` — newer Wrangler 4.x requires Node 22, while Cloudflare Builds still runs Node 20.

#### Public (`NEXT_PUBLIC_*`)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon JWT |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://your-domain.pages.dev` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | ✅ | `ku` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Google Maps key |

#### Server-only (encrypted)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin CRUD, uploads, editors |
| `SUPER_ADMIN_EMAIL` | ✅ | Bootstrap admin identity |
| `RESEND_API_KEY` | ✅ | Password reset emails |
| `RESEND_FROM_EMAIL` | ✅ | Sender address |
| `GEMINI_API_KEY` | ✅ | AI chat + generate |
| `GEMINI_MODEL` | Optional | Default: `gemini-3.5-flash` |
| `GEMINI_FALLBACK_MODEL` | Optional | Fallback model |

#### Must NOT be set in production

| Variable | Reason |
|----------|--------|
| `DEV_AUTH_ENABLED` | Bypasses real Supabase auth |
| `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` | Dev-only credentials |

See `.env.production.example` for the full template.

### 5. Supabase Auth Redirect URLs

In Supabase → Authentication → URL configuration, add:

```
https://your-domain.pages.dev/auth/callback
```

### 6. Optional: R2 Incremental Cache

For improved ISR/cache performance:

1. Create R2 bucket `nova-home-decor-cache`
2. Uncomment `r2_buckets` in `wrangler.jsonc`
3. Import `r2IncrementalCache` in `open-next.config.ts` (see OpenNext docs)

### 7. Post-Deploy Verification

`GET /api/health` returns:

```json
{
  "ok": true,
  "environment": "OK",
  "supabase": "OK",
  "database": "OK",
  "auth": "OK",
  "resend": "OK",
  "gemini": "OK",
  "cloudflare": "OK",
  "storage": "OK",
  "admin": "OK",
  "details": { "...": "per-check diagnostics" }
}
```

**Active Supabase project ref:** `pdmsbboxhfpexklkqvqr` → `https://pdmsbboxhfpexklkqvqr.supabase.co`

- [ ] `GET /api/health` returns `"ok": true` (checks Supabase, service role, Resend, Gemini, admin)
- [ ] Public homepage loads (ku / ar / en)
- [ ] Admin login via Supabase
- [ ] Forgot password OTP email via Resend
- [ ] CMS save/publish (server actions)
- [ ] Media upload to Supabase Storage
- [ ] AI chat streaming (`/api/ai/chat`)
- [ ] `/sitemap.xml` and `/robots.txt`
- [ ] `DEV_AUTH_ENABLED` is unset/false

**Required runtime Secrets** (never commit): `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `GEMINI_API_KEY`  
**Required runtime/public vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPER_ADMIN_EMAIL`, `RESEND_FROM_EMAIL`

### 8. Local Cloudflare Preview

```bash
cp .dev.vars.example .dev.vars
# Add secrets to .dev.vars or use wrangler secret
npm run preview:cloudflare
```

---

## Deployment Readiness Report

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Cloudflare Pages / Workers compatibility | **PASS** | OpenNext adapter configured |
| 2 | Framework detection (Next.js 15) | **PASS** | App Router, 15.5.20 |
| 3 | Cloudflare config files | **PASS** | `wrangler.jsonc`, `open-next.config.ts`, `_headers` |
| 4 | Production build settings | **PASS** | `npm run build` → OpenNext (`buildCommand: npx next build`) |
| 5 | Build optimized for Cloudflare | **PASS** | OpenNext bundle + static asset headers |
| 6 | Vercel conflicts removed | **PASS** | No `vercel.json`; `standalone` only for Docker |
| 7 | Environment variables documented | **PASS** | `.env.production.example` complete |
| 8 | Deployment checklist | **PASS** | This document |
| 9 | API routes (`/api/ai/*`, geocode, auth) | **PASS** | Built as dynamic routes; `nodejs_compat` enabled |
| 10 | Image optimization | **PASS** | Cloudflare Images binding in `wrangler.jsonc` |
| 11 | AI routes | **PASS** | Included in build; Gemini server-only |
| 12 | Supabase connection | **PASS** | SSR client + middleware; env vars required at deploy |
| 13 | Storage (Supabase) | **PASS** | Uploads via service role; not Cloudflare R2 |
| 14 | Authentication | **PASS** | Middleware session refresh + `/auth/callback` |
| 15 | Middleware | **PASS** | Bundled by OpenNext (91 kB) |
| 16 | Edge compatibility | **PASS** | Node.js runtime via `nodejs_compat` (not Edge-only) |
| 17 | Redirects & headers | **PASS** | `public/_headers` for static cache |
| 18 | SEO / sitemap | **PASS** | Dynamic `sitemap.ts` + `robots.ts` in build |
| 19 | robots.txt | **PASS** | `src/app/robots.ts` → `/robots.txt` |
| 20 | Dynamic routes | **PASS** | Admin SSR, API routes, ISR pages |
| 21 | Localization (ku / ar / en) | **PASS** | No deployment changes to i18n |
| 22 | Production build zero errors | **PASS** | `npm run build` + `opennextjs-cloudflare build` succeeded |
| 23 | Deployment issues auto-fixed | **PASS** | TS build error, tsconfig, Docker dual-build |
| 24 | Production-ready CF configuration | **PASS** | See `wrangler.jsonc` + scripts |
| 25 | Functionality preserved | **PASS** | Deployment-only diffs |

### Known Limitations (Post-Deploy Monitoring)

| Item | Status | Action |
|------|--------|--------|
| QA scanner on Workers | **WARN** | Uses `node:fs` — run QA locally or on CI, not in Worker |
| In-memory AI rate limit | **WARN** | Per-isolate; consider KV/Durable Objects for global limits |
| `/api/dev-uploads` | **PASS** | Returns 404 in production (by design) |
| Docker VPS deploy | **PASS** | Unchanged — `DOCKER_BUILD=1` in Dockerfile |

---

## Overall Status: **READY FOR CLOUDFLARE DEPLOYMENT**

Deploy when all production environment variables are set and Supabase redirect URLs are configured.

### Quick Commands

```bash
# Cloudflare worker bundle (same as Workers Builds `npm run build`)
npm run build

# Preview locally (Workers runtime)
npm run preview:cloudflare

# Deploy to Cloudflare
npm run deploy:cloudflare
```

### Wrangler Configuration Summary

- **Worker name:** `nova-home-decor-cms`
- **Entry:** `.open-next/worker.js`
- **Assets:** `.open-next/assets`
- **Flags:** `nodejs_compat`, `global_fetch_strictly_public`
- **Images binding:** `IMAGES` (Cloudflare Images)

---

## Dual Deployment Paths

| Target | Build command | Output |
|--------|---------------|--------|
| **Cloudflare** | `npm run build` | `.open-next/` worker |
| **Docker / VPS** | `npm run build:docker` (`DOCKER_BUILD=1` in Dockerfile) | `.next/standalone/` |

Both paths coexist without breaking the other.
