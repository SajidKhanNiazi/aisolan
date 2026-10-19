# BookPilot AI — Local Development Setup Guide

> **Milestone:** Phase 1A  
> **Target Environment:** Node.js 20+ / 22+ / 24+ with npm

---

## 1. Prerequisites
- **Node.js**: `v20.x`, `v22.x`, or `v24.x` (verified with v24.15.0).
- **Package Manager**: `npm` (v10+ or v11+).
- **Git**: Installed and configured.

---

## 2. Installation & Quick Start

```bash
# 1. Clone repository (or navigate to workspace)
cd "c:/laragon/www/Ai Salon software"

# 2. Install dependencies
npm install

# 3. Create local environment configuration
copy .env.example .env.local

# 4. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Environment Configuration
Inspect `.env.local`. In Phase 1A, external services are optional for testing the application shell and static build:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

When connecting a Supabase development project in Phase 1B:
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Retrieve the **Project URL** and **anon / public key** from Settings -> API.
3. Add them to `.env.local`. **Never add the secret service_role key to browser-safe variables.**

---

## 4. Quality Assurance Commands

```bash
# Type check without emitting files
npm run typecheck

# Run ESLint linter
npm run lint

# Run Vitest unit tests
npm run test

# Run Next.js production build
npm run build
```

---

## 5. Troubleshooting Common Issues
- **EEXIST or Prerender Cache Errors:** Delete the `.next` directory (`rm -r .next` or PowerShell `Remove-Item -Recurse -Force .next`) and re-run `npm run build`.
- **Port Conflict (3000 in use):** Next.js automatically suggests port 3001, or run `npm run dev -- -p 3005`.
