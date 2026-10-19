# BookPilot AI — Vercel Staging Deployment Guide

> **Milestone:** Phase 1A  
> **Target Hosting Platform:** Vercel (Staging / Preview Deployments)

---

## 1. Staging Strategy & Boundaries
In accordance with `AGENTS.md` and the master plan:
- Staging deployments exist to verify build compatibility, routing, asset integrity, and preview functionality.
- **Never deploy unapproved changes to production.**
- Staging must use isolated development credentials and must **never** connect to production customer databases.

---

## 2. Vercel Staging Setup Steps

### Step 1: Push to GitHub Feature Branch
```bash
git push -u origin feat/phase-1a-foundation
```

### Step 2: Connect Vercel Project
1. Log in to [vercel.com](https://vercel.com) with authorized credentials.
2. Click **Add New Project** and select the BookPilot AI repository.
3. Framework Preset: **Next.js**.
4. Root Directory: `./`.

### Step 3: Configure Environment Variables in Vercel
Under Project Settings -> Environment Variables, configure for the **Preview** and **Development** environments:
- `NEXT_PUBLIC_APP_URL`: Your Vercel preview domain (e.g., `https://bookpilot-ai-preview.vercel.app`).
- `NEXT_PUBLIC_SUPABASE_URL`: Development Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Development Supabase anon key.

### Step 4: Verification Checklist Post-Deployment
- [ ] Homepage (`/`) loads without stylesheet or font flash.
- [ ] `/dashboard` displays development placeholder notice.
- [ ] `/booking` displays under-development notice.
- [ ] `GET /api/health` responds with `200 OK` and `{ "status": "ok", "service": "bookpilot" }`.
- [ ] Browser console reports zero unhandled errors or missing assets.
- [ ] Client bundles do not contain server secrets.

---

## 3. Rollback Procedures
If a staging build fails or exhibits regressions:
1. In the Vercel Dashboard, navigate to **Deployments**.
2. Select the last verified successful deployment.
3. Click the options menu (`...`) and select **Instant Rollback**.
