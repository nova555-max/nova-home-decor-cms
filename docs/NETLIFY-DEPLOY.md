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
| `NEXT_PUBLIC_APP_URL` | `https://nova-home-decor.com` (primary custom domain) |

### Secrets (Netlify UI only — never commit)

| Name | Notes |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Same project: `sb_secret_…` **or** legacy JWT `role=service_role` |
| `RESEND_API_KEY` | `re_…` |
| `GEMINI_API_KEY` | optional for AI chat |

Do **not** mix keys from older Supabase projects.  
Do **not** set `DEV_AUTH_ENABLED` on Netlify.

## 3. Custom domain (`nova-home-decor.com`)

Domain is already pointed at this Netlify site:

- **Primary:** `https://nova-home-decor.com`
- **www:** `https://www.nova-home-decor.com` → redirects to apex (Netlify default)

### Netlify UI checklist

1. **Domain management** → confirm both `nova-home-decor.com` and `www.nova-home-decor.com` are listed and **HTTPS** is green (Let's Encrypt).
2. **Environment variables** → set/update:
   - `NEXT_PUBLIC_APP_URL` = `https://nova-home-decor.com`
3. **Trigger Deploy** → Deploys → Trigger deploy → Clear cache and deploy site (so the new APP_URL is baked into the build).

### DNS (if you ever re-point)

At your domain registrar:

| Type | Name | Value |
|------|------|--------|
| **A** | `@` | `75.2.60.5` (Netlify also accepts their current A records) |
| **CNAME** | `www` | `timely-klepon-1dc4f9.netlify.app` |

Or use Netlify DNS name servers if you prefer Netlify to manage DNS.

## 4. Supabase Auth (required for login)

In project **zfsoeketfjnnpirglosq** → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://nova-home-decor.com` |
| Redirect URLs | `https://nova-home-decor.com/**` |
| | `https://nova-home-decor.com/auth/callback` |
| | `https://nova-home-decor.com/login` |
| | `https://nova-home-decor.com/admin/**` |
| | `https://www.nova-home-decor.com/**` |
| | `https://www.nova-home-decor.com/auth/callback` |
| | `https://timely-klepon-1dc4f9.netlify.app/**` |

Also enable **Email** provider (password login).

Existing admin: `novahome756@gmail.com` (already in `auth.users` + `admin_users`).  
If password is unknown: Supabase → Authentication → Users → Reset password, or use forgot-password in the app.

## 5. After deploy

1. Open `https://nova-home-decor.com/api/health` — Supabase URL must show `zfsoeketfjnnpirglosq`
2. Open `https://www.nova-home-decor.com` — should redirect to apex and load the site
3. Login at `https://nova-home-decor.com/admin`
4. Confirm browser console has **no** Realtime WebSocket spam on the public homepage
5. Test creating an editor under Admin → Editors
6. Test forgot-password

## Notes

- Cloudflare remains optional via `npm run build:cloudflare` / `deploy:cloudflare`
- Prefer legacy **anon JWT** (`eyJ…`) if `sb_publishable_…` causes Auth/Realtime issues; both are supported
- Service role accepts `sb_secret_…` and legacy `service_role` JWT
- Keep the `*.netlify.app` URL as a backup redirect URL until you no longer need it
