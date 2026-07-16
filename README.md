# Nova Home Decor CMS

Production-ready CMS and public website for Nova Home Decor.

## Stack

- Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui
- Supabase (database, auth, storage, realtime)
- TanStack Query · Framer Motion · React Hook Form · Zod

## CMS Modules

| Module | Route | Description |
| --- | --- | --- |
| Dashboard | `/admin` | Content overview and quick actions |
| Categories | `/admin/categories` | Product categories |
| Products | `/admin/products` | Home decor catalog |
| Projects | `/admin/projects` | Completed design projects |
| Gallery | `/admin/gallery` | Portfolio images |
| Website Settings | `/admin/settings` | Logo, contact, social links |

**Website Settings includes only:**
- Company Logo · Company Name · Phone · WhatsApp
- Google Maps link · Address · Facebook · Instagram · TikTok

## Setup

### 1. Environment

```bash
cp .env.example .env.local
```

Add your Supabase URL and anon key.

### 2. Database

Run migrations **in order** in Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_cms_extensions.sql
supabase/migrations/003_premium_features.sql
supabase/migrations/004_premium_cms.sql
supabase/migrations/005_seed_categories.sql   ← optional default categories
```

Check setup status:

```bash
npm run setup:check
```

### Dev without Supabase

With placeholder `.env.local`, categories save to `.data/categories.json` on localhost (requires `DEV_AUTH_ENABLED=true`).

### 3. Admin user

In Supabase Dashboard → Authentication → Users, create an admin user with email/password.

### 4. Run

```bash
npm install
npm run dev
```

- Public website: [http://localhost:3000](http://localhost:3000)
- Admin panel: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Live updates

When an admin saves changes:

1. **Server cache** is invalidated via `revalidateTag`
2. **Supabase Realtime** triggers a refresh on the public website
3. Visitors see updated content without redeploying

## Deploy (production)

See **[docs/DEPLOY.md](docs/DEPLOY.md)** — Docker on VPS, Nginx + HTTPS, or Vercel.

Quick VPS:

```bash
cp .env.production.example .env.production
# edit Supabase + domain
docker compose up -d --build
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | TypeScript check |

## Project structure

```
src/
├── app/
│   ├── (public)/          # Public website
│   └── admin/             # CMS (login + dashboard modules)
├── components/
│   ├── admin/             # CMS UI
│   └── public/            # Website sections
├── lib/
│   ├── actions/           # Server actions (CRUD)
│   ├── queries/           # Data fetching
│   └── supabase/          # Supabase clients
└── types/                 # Database types
supabase/migrations/       # SQL schema
```
