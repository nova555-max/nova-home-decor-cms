# Netlify deployment (primary)

**Build command:** `npm run build` (= `next build`)  
**Publish directory:** leave blank (owned by `@netlify/plugin-nextjs`)  
**Node:** 20  

## 1. Connect the repo

Netlify → Add new site → Import from Git → `nova555-max/nova-home-decor-cms` → branch `main`.

## 2. Environment variables

Site configuration → Environment variables  
Enable for **Builds** and **Functions** (Production + Deploy Previews).

### Critical: use ONE Supabase project

Admin users and Auth accounts live in **`zfsoeketfjnnpirglosq`**.  
Do **not** point Netlify at `pdmsbboxhfpexklkqvqr` (or any other project) — that causes “Invalid email or password” even when users exist.

If Netlify UI already has old `NEXT_PUBLIC_SUPABASE_*` values, **edit or delete them** so they match the table below (UI overrides `netlify.toml`).

### Public (also prefilled in `netlify.toml` for Builds)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zfsoeketfjnnpirglosq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | legacy anon JWT for `zfsoeketfjnnpirglosq` (starts with `eyJ…`, role=`anon`) — preferred over `sb_publishable_…` for Auth |
| `NEXT_PUBLIC_APP_URL` | your Netlify URL e.g. `https://YOUR-SITE.netlify.app` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `ku` |
| `SUPER_ADMIN_EMAIL` | `novahome756@gmail.com` |
| `RESEND_FROM_EMAIL` | `Nova Home Decor <onboarding@resend.dev>` |

### Secrets (Netlify UI only — never commit)

| Name | Notes |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Same project: `sb_secret_…` **or** legacy JWT `role=service_role` |
| `RESEND_API_KEY` | `re_…` |
| `GEMINI_API_KEY` | optional for AI chat |

Do **not** mix keys from older Supabase projects.  
Do **not** set `DEV_AUTH_ENABLED` on Netlify.

## 3. Supabase Auth (required for login)

In project **zfsoeketfjnnpirglosq** → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://YOUR-SITE.netlify.app` |
| Redirect URLs | `https://YOUR-SITE.netlify.app/**` |
| | `https://YOUR-SITE.netlify.app/auth/callback` |
| | `https://YOUR-SITE.netlify.app/login` |
| | `https://YOUR-SITE.netlify.app/admin/**` |

Also enable **Email** provider (password login).

Existing admin: `novahome756@gmail.com` (already in `auth.users` + `admin_users`).  
If password is unknown: Supabase → Authentication → Users → Reset password, or use forgot-password in the app.

## 4. After deploy

1. Open `https://YOUR-SITE.netlify.app/api/health` — Supabase URL must show `zfsoeketfjnnpirglosq`
2. Login works without `/admin/setup` (admin already exists)
3. Confirm browser console has **no** Realtime WebSocket spam on the public homepage
4. Test creating an editor under Admin → Editors
5. Test forgot-password

## Notes

- Cloudflare remains optional via `npm run build:cloudflare` / `deploy:cloudflare`
- Prefer legacy **anon JWT** (`eyJ…`) if `sb_publishable_…` causes Auth/Realtime issues; both are supported
- Service role accepts `sb_secret_…` and legacy `service_role` JWT
