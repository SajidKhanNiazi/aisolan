# BookPilot AI — Architecture Overview

> **Phase:** Phase 1A Baseline  
> **Status:** Implemented & Verified Foundation  
> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) & [BOOKPILOT_PROJECT_MASTER_PLAN.md](file:///c:/laragon/www/Ai%20Salon%20software/BOOKPILOT_PROJECT_MASTER_PLAN.md)

---

## 1. System Topology
BookPilot AI is a multi-tenant Software-as-a-Service (SaaS) platform built on the Next.js App Router with TypeScript and a Supabase PostgreSQL backend.

```
+--------------------------------------------------------------------------+
|                              CLIENT CHANNELS                             |
|  - Mobile Public Web (/booking/[slug])                                  |
|  - Owner / Staff Dashboard (/dashboard)                                  |
|  - Future AI Chat Widget (Phase 2)                                       |
|  - Future WhatsApp Cloud API (Phase 3)                                   |
|  - Future Telephone SIP Gateway (Phase 4)                                |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                     NEXT.JS APPLICATION LAYER (App Router)               |
|  - Server Components (SSR / Static Prerendering)                         |
|  - Route Handlers (/api/health, /api/booking, etc.)                      |
|  - Client Components (Interactive UI Primitives via Radix / Tailwind)   |
|  - Safe Environment Validation (src/lib/env)                             |
|  - Modular Domain Features (src/features/*)                              |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                  DATABASE & AUTHENTICATION (Supabase)                    |
|  - Client Utility: Browser-Safe Key access only (src/lib/supabase/client)|
|  - Server Utility: Cookie-aware Server Client (src/lib/supabase/server)  |
|  - Future Tenant Scoping: organization_id on all tables (Phase 1B)       |
|  - Future Double-Booking Guard: PostgreSQL tstzrange Exclusion Locks     |
+--------------------------------------------------------------------------+
```

---

## 2. Responsibilities Separation

### Frontend Responsibilities
- Fast, mobile-first responsive interfaces optimized for viewports from 320px to 1440px+.
- Accessible semantic markup adhering to WCAG 2.1 AA standards.
- Tokenized self-service booking management links (no client-side customer password storage).
- Zero exposure of service role keys or secret tokens.

### Backend Responsibilities
- Deterministic booking calculation engine resolving staff shifts, breaks, holidays, and buffers in the salon's IANA timezone.
- Concurrency-safe atomic appointment reservations using PostgreSQL transactions and exclusion constraints.
- Multi-tenant isolation enforced at the service layer and database Row Level Security (RLS).
- Server-side tool execution adapter for the AI receptionist.

---

## 3. Future Architectural Boundaries

### Phase 1B: Multi-Tenant & Auth Boundaries
- Every business table references `organization_id`.
- Supabase Auth handles identity; `organization_memberships` manages RBAC roles (`business_owner`, `manager_receptionist`, `staff_member`).
- Endpoint security validates caller membership before any database query.

### Phase 1C/1D: Booking Engine Boundaries
- A single unified booking engine computes slots for all channels.
- Booking reservations acquire an atomic reservation lock.
- Double bookings are prevented at the database level (`23P01` exclusion violation).

### Phase 2: AI Receptionist Boundaries
- The LLM receives whitelisted JSON schema tools.
- Mutation actions (`create_booking`, `cancel_booking`, `reschedule_booking`) require explicit prior customer confirmation.
- The AI never has direct SQL access.
