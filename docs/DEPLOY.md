# Deploy — Nova Home Decor CMS

## پێش deploy (پێویست)

1. **Supabase** — پڕۆژەی ڕاستەقینە + migrations 001–005
2. **Admin user** — لە Supabase → Authentication → Users دروست بکە
3. **`.env.production`** — لە `.env.production.example` کۆپی بکە و نرخەکان بنووسە
4. **`NEXT_PUBLIC_APP_URL`** — دۆمەینەکەت (وەک `https://novahomedecor.com`)

---

## VPS + Docker (پێشنیارکراو)

### 1. فایلەکان بگەیەنە سێرڤەر

Windows (PowerShell):

```powershell
scp -r "C:\Users\wagon\Desktop\New folder\nova-home-decor-cms" user@YOUR_SERVER_IP:/home/user/
```

یان ZIP بکە و لە FileZilla / WinSCP بگەیەنە.

### 2. لەسەر سێrڤەر (Ubuntu)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
cd /home/user/nova-home-decor-cms
cp .env.production.example .env.production
nano .env.production   # Supabase + domain
docker compose up -d --build
```

سایت: `http://YOUR_SERVER_IP:3000`

### 3. HTTPS (Nginx + Let's Encrypt)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/nova`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nova /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

---

## Vercel (ئاسانتر، بێ VPS)

1. کۆد لە GitHub بخە
2. [vercel.com](https://vercel.com) → Import project
3. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` = Vercel URL یان دۆمەین
   - `SUPER_ADMIN_EMAIL`
4. **Deploy** — `DEV_AUTH_*` مەدانێ

---

## Supabase — Redirect URLs

لە Supabase → Authentication → URL Configuration:

- **Site URL:** `https://your-domain.com`
- **Redirect URLs:** `https://your-domain.com/admin/reset-password`

---

## نوێکردنەوە (update)

```bash
cd /home/user/nova-home-decor-cms
# فایلە نوێکان بگەیەنە
docker compose up -d --build
```

---

## تاقیکردنەوە

- ماڵپەڕ: `/`
- Admin: `/admin/login`
- `npm run setup:check` (لە local)
