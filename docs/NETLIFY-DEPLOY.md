# Netlify deployment (primary)

**Build command:** `npm run build` (= `next build`)  
**Publish directory:** leave blank (owned by `@netlify/plugin-nextjs`)  
**Node:** 20  

## 1. Connect the repo

Netlify → Add new site → Import from Git → `nova555-max/nova-home-decor-cms` → branch `main`.

## 2. Environment variables

Site configuration → Environment variables  
Enable for **Builds** and **Functions** (Production + Deploy Previews).

### Public (also prefilled in `netlify.toml` for Builds)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pdmsbboxhfpexklkqvqr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_oj0uEtmgE0STtXKeGYcQtA_EOWiu02-` |
| `NEXT_PUBLIC_APP_URL` | your Netlify URL e.g. `https://YOUR-SITE.netlify.app` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `ku` |
| `SUPER_ADMIN_EMAIL` | `novahome756@gmail.com` |
| `RESEND_FROM_EMAIL` | `Nova Home Decor <onboarding@resend.dev>` |

### Secrets (Netlify UI only — never commit)

| Name | Notes |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | JWT `role=service_role` for project `pdmsbboxhfpexklkqvqr` |
| `RESEND_API_KEY` | `re_…` |
| `GEMINI_API_KEY` | optional for AI chat |

Do **not** mix keys from older Supabase projects.

## 3. Supabase Auth (required for login)

Supabase → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://YOUR-SITE.netlify.app` |
| Redirect URLs | `https://YOUR-SITE.netlify.app/**` |
| | `https://YOUR-SITE.netlify.app/auth/callback` |
| | `https://YOUR-SITE.netlify.app/login` |
| | `https://YOUR-SITE.netlify.app/admin/**` |

Also enable **Email** provider (password login).

If login says “no admin_users row”, open `/admin/setup` once (or insert the admin profile).

## 4. After deploy

1. Open `https://YOUR-SITE.netlify.app/api/health`
2. Create admin if needed: `/admin/setup`
3. Login: `novahome756@gmail.com`
4. Confirm browser console has **no** Realtime WebSocket spam on the public homepage
5. Test forgot-password

## Notes

- Cloudflare remains optional via `npm run build:cloudflare` / `deploy:cloudflare`
- Never set `DEV_AUTH_ENABLED` on Netlify production
- Prefer legacy **anon JWT** (`eyJ…`) if `sb_publishable_…` causes Auth/Realtime issues; both are supported