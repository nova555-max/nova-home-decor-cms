# Netlify deployment (Nova Home Decor CMS)

**Build command:** `npm run build` (= `next build`)  
**Publish directory:** leave blank (owned by `@netlify/plugin-nextjs`)  
**Node:** 20

## 1. Connect the repo

Netlify → Add new site → Import from Git → `nova555-max/nova-home-decor-cms` → branch `main`.

## 2. Environment variables

Site configuration → Environment variables  
Enable for **Builds** and **Functions** (Production + Deploy Previews).

### Public

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pdmsbboxhfpexklkqvqr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon JWT or `sb_publishable_…` for **same** project |
| `NEXT_PUBLIC_APP_URL` | your Netlify URL e.g. `https://YOUR-SITE.netlify.app` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `ku` |
| `SUPER_ADMIN_EMAIL` | `novahome756@gmail.com` |
| `RESEND_FROM_EMAIL` | `Nova Home Decor <onboarding@resend.dev>` |

### Secrets

| Name | Notes |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | JWT with `role=service_role` for **same** project as URL |
| `RESEND_API_KEY` | `re_…` |
| `GEMINI_API_KEY` | optional for AI |

Do **not** mix keys from older projects with `pdmsbboxhfpexklkqvqr`.

## 3. Supabase Auth redirect

Supabase → Authentication → URL configuration:

```
https://YOUR-SITE.netlify.app/auth/callback
```

Also add the Site URL.

## 4. After deploy

1. Open `/api/health` — `supabase`, `serviceRole`, `resend`, `admin` should be ok  
2. Login: `novahome756@gmail.com` / your admin password  
3. Test forgot-password OTP email  

## Notes

- Cloudflare scripts remain as `npm run build:cloudflare` / `deploy:cloudflare` if needed later.  
- Never set `DEV_AUTH_ENABLED` on Netlify production.
