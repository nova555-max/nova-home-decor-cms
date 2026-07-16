# GitHub Integration Setup

**Project:** `nova-home-decor-cms`  
**Target branch:** `main`

---

## Prerequisites (install once)

### 1. Git for Windows

Download and install: https://git-scm.com/download/win

During install, enable **"Git from the command line and also from 3rd-party software"**.

Restart your terminal after install, then verify:

```powershell
git --version
```

### 2. GitHub authentication (choose one)

**Option A — GitHub CLI (recommended)**

```powershell
winget install GitHub.cli
gh auth login
```

Follow the browser login flow when prompted.

**Option B — HTTPS + Personal Access Token**

Create a token at: https://github.com/settings/tokens (scope: `repo`)

---

## Repository Setup (run from project root)

```powershell
cd "C:\Users\wagon\Desktop\New folder\nova-home-decor-cms"
```

### Step 1 — Initialize Git

```powershell
git init -b main
```

### Step 2 — Verify ignored files (no secrets staged)

```powershell
git status
```

Confirm `.env.local`, `node_modules/`, `.next/`, `.open-next/`, `.data/` are **not** listed.

### Step 3 — Stage all project files

```powershell
git add .
git status
```

### Step 4 — Initial commit

```powershell
git commit -m "Initial commit: Nova Home Decor CMS

Next.js 15 CMS with Supabase, admin panel, AI chat, and Cloudflare deployment config."
```

---

## Connect to GitHub

### Create empty repository on GitHub

1. Go to https://github.com/new
2. Repository name: `nova-home-decor-cms` (or your choice)
3. **Do not** add README, .gitignore, or license (already in project)
4. Click **Create repository**

### Add remote and push

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub details:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

**SSH alternative:**

```powershell
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Git installed | `git --version` | `git version 2.x` |
| Repository initialized | `Test-Path .git` | `True` |
| Branch is main | `git branch --show-current` | `main` |
| Remote configured | `git remote -v` | `origin` → GitHub URL |
| No secrets tracked | `git ls-files \| Select-String "\.env"` | Only `.env.example` templates |
| Lockfile committed | `git ls-files package-lock.json` | `package-lock.json` |
| README committed | `git ls-files README.md` | `README.md` |

---

## Troubleshooting

### `git` not recognized

Install Git for Windows and restart the terminal.

### Authentication failed on push

```powershell
gh auth login
# OR use a Personal Access Token as password when prompted for HTTPS
```

### Large files / push rejected

Ensure `node_modules/` and `.next/` are in `.gitignore` and not staged:

```powershell
git rm -r --cached node_modules .next .open-next 2>$null
git add .gitignore
git commit -m "Fix: ensure build artifacts are not tracked"
```

### Wrong branch name

```powershell
git branch -M main
```

---

## Post-Push: Cloudflare Pages Git Integration

After the repo is on GitHub:

1. Cloudflare Dashboard → Workers & Pages → Create → Connect to Git
2. Select `nova-home-decor-cms` repository
3. Build command: `npm ci && npx opennextjs-cloudflare build`
4. Set environment variables (see `docs/CLOUDFLARE-DEPLOY.md`)

---

## Files Prepared for GitHub

| File | Purpose |
|------|---------|
| `.gitignore` | Next.js, Cloudflare, env secrets, build output |
| `package-lock.json` | Reproducible npm installs |
| `README.md` | Project documentation |
| `.env.example` | Safe env template (committed) |
| `.env.production.example` | Production env template (committed) |

**Never committed:** `.env.local`, `.dev.vars`, `node_modules/`, `.next/`, `.open-next/`, `.data/`
