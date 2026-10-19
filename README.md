# BookPilot AI — Appointment Booking & AI Receptionist SaaS

> **Multi-tenant appointment booking engine and explainable AI receptionist SaaS platform for independent salons, barbershops, and service businesses.**

---

## 1. Project Overview

**BookPilot AI** provides independent service businesses (starting with barbershops and hair salons with 1–10 staff) with a mobile-first, collision-safe booking engine and an intelligent, tool-using AI receptionist. 

### Core Architectural Pillars
- **Single Source of Truth**: All booking channels (Public Mobile Web, AI Web Chat, WhatsApp Messaging, Telephone Voice) use the exact same deterministic backend booking engine and PostgreSQL database.
- **Concurrency & Collision Safety**: Hardened against double-booking races using PostgreSQL atomic transactions and range exclusion constraints (`tstzrange` with GIST index).
- **Tool-Using AI Receptionist**: The conversational agent understands natural language and extracts intent, but relies exclusively on whitelisted, deterministic server tools for availability, pricing, policies, and booking mutations.
- **Strict Multi-Tenant Isolation**: Full tenant scoping (`organization_id`) enforced at both the API layer and the database layer (Row Level Security).

---

## 2. Project Documentation & Governance

This repository is governed by two foundational planning documents:
1. [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md): Operating instructions, security guidelines, coding behavior, and response protocols for AI coding agents.
2. [BOOKPILOT_PROJECT_MASTER_PLAN.md](file:///c:/laragon/www/Ai%20Salon%20software/BOOKPILOT_PROJECT_MASTER_PLAN.md): Executive decisions, domain model, phased roadmap, acceptance checklists, and business validation strategy.

### Phase 0 Specifications
- [System Architecture & Technical Specifications](file:///c:/laragon/www/Ai%20Salon%20software/docs/architecture.md)
- [Database Data Model & Schema Specifications](file:///c:/laragon/www/Ai%20Salon%20software/docs/data-model.md)
- [User Roles, Permissions & Security Matrix](file:///c:/laragon/www/Ai%20Salon%20software/docs/permissions.md)
- [Product Backlog & Detailed User Stories](file:///c:/laragon/www/Ai%20Salon%20software/docs/backlog.md)
- [External Integrations & Provider Specifications](file:///c:/laragon/www/Ai%20Salon%20software/docs/integrations.md)
- [Quality Assurance & Detailed Verification Plan](file:///c:/laragon/www/Ai%20Salon%20software/docs/test-plan.md)

### Phase 1A Documentation & Guides
- [Architecture Overview](file:///c:/laragon/www/Ai%20Salon%20software/docs/architecture/overview.md)
- [Local Development Setup](file:///c:/laragon/www/Ai%20Salon%20software/docs/development/setup.md)
- [Staging Deployment Guide](file:///c:/laragon/www/Ai%20Salon%20software/docs/deployment/staging.md)
- [Phase 1A Implementation & QA Report](file:///c:/laragon/www/Ai%20Salon%20software/docs/qa/phase-1a-report.md)

---

## 3. Technology Stack

- **Frontend & App APIs**: Next.js 16 (App Router, React 19, TypeScript)
- **UI & Accessibility**: Tailwind CSS v4, Lucide icons, accessible component primitives
- **Database & Auth**: PostgreSQL 15+ hosted on Supabase, SSR client/server utilities
- **Testing**: Vitest unit testing, TypeScript compiler (`tsc --noEmit`), ESLint
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`), Vercel staging deployment

---

## 4. Local Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables template
copy .env.example .env.local

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application shell.

### Quality Assurance Commands
```bash
npm run typecheck   # Typecheck (tsc --noEmit)
npm run lint        # ESLint
npm run test        # Unit tests (Vitest)
npm run build       # Production build
```

---

## 5. Delivery Roadmap

- [x] **Phase 0 — Discovery & Architecture Specifications** (Complete)
- [x] **Phase 1A — Technical Project Foundation** (Complete & Verified)
- [ ] **Phase 1B — Authentication & Multi-Tenant Foundation** (Next milestone)
- [ ] **Phase 1C — Staff, Services & Scheduling Core**
- [ ] **Phase 1D — Booking Engine & Concurrency Safety**
- [ ] **Phase 2 — Tool-Using AI Website Receptionist**
- [ ] **Phase 3 — WhatsApp Text Messaging Integration**
- [ ] **Phase 4 — Live Telephone AI Voice Pilot**
- [ ] **Phase 5 — Commercialization, Billing & Multi-Location**
