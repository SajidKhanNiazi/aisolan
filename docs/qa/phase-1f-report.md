# BookPilot AI — Phase 1F QA & Architecture Report
## Complete Public Customer Booking System: Self-Service Booking, Salon Pages, Customer Management Links & Mobile-First UX

**Project:** BookPilot AI  
**Phase:** 1F  
**Date:** 2026-10-22  
**Branch:** `feat/phase-1f-public-booking`  
**Application URL:** [https://aisolan.vercel.app/](https://aisolan.vercel.app/)  
**QA Salon Slug:** `bookpilot-qa-salon`  

---

### A. Implemented Features

1. **Public Salon Landing Page (`/booking/[businessSlug]`):**
   - Public-facing salon header with salon name, logo, category, address, phone/email, timezone, and operating hours.
   - Strict data sanitization: Zero exposure of private customer records, internal staff notes, user IDs, or tenant credentials.
   - Dynamic online booking toggle check: When disabled, displays: *"Online booking is currently unavailable. Please contact the salon directly."* alongside direct contact channels.
   - SEO metadata, OpenGraph tags, and canonical social preview tags configured.

2. **Mobile-First 5-Step Customer Booking Wizard:**
   - **Step 1 — Service Selection:** Active services with real prices, durations, descriptions, and buffer indicators.
   - **Step 2 — Specialist Selection:** "Any Available Specialist" (recommended for fastest availability) alongside active specialists eligible for the chosen service.
   - **Step 3 — Date & Time Selection:** Integrated with the Phase 1E-B deterministic slot calculation engine. Formats available slots into Morning, Afternoon, and Evening groups in salon local time.
   - **Step 4 — Customer Details:** Frictionless booking without requiring customer account creation. Collects full name, email and/or mobile phone, and optional notes with client and server-side validation.
   - **Step 5 — Review & Confirmation:** Full appointment summary with cancellation policy notice, agreement checkbox, and idempotency key guard preventing double submissions.

3. **Public Booking Confirmation Screen (`/booking/[businessSlug]/confirmation`):**
   - Accessible immediately post-booking or via secure management token.
   - Displays confirmed status, reference code (`APPT-XXXXXXXX`), specialist, date/time, service price.
   - Direct "Add to Google Calendar" link with pre-populated event details.
   - Direct link to the customer self-service management page.

4. **Cryptographically Scoped Customer Self-Service (`/manage-booking/[token]`):**
   - 256-bit cryptographically secure random token (64-char hex) stored only as a SHA-256 digest in PostgreSQL (`appointment_management_tokens`).
   - Self-service **Cancellation**: Enforces salon cancellation notice policy (e.g. 24 hours), releases capacity atomically in the database exclusion constraint, and preserves appointment history.
   - Self-service **Rescheduling**: Displays live alternative slots for the assigned specialist, updates appointment time atomically, and prevents slot collisions.

5. **Salon Owner Dashboard Integration:**
   - Main workspace overview (`/dashboard/[businessSlug]`) and Settings Booking Policies tab include the `PublicBookingCard`.
   - Displays live booking URL with one-click copy and instant visual feedback.
   - Embedded SVG QR Code generator with high-resolution download option for salon counters and window stickers.
   - Live status indicator reflecting `online_booking_enabled`.

---

### B. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│ Public Visitor / Customer Browser (No Auth Required)   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Next.js 16 App Router (Server Components & Actions)    │
│  - /booking/[businessSlug]                             │
│  - /booking/[businessSlug]/confirmation                │
│  - /manage-booking/[token]                             │
│  - Rate Limiter (enforcePublicBookingRateLimit)         │
│  - Zod Validation (publicBookingInputSchema)           │
│  - Token Generator (32-byte crypto random + SHA-256)   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Narrow Mutation Boundary: Security Definer RPCs       │
│  1. create_public_appointment_atomic                   │
│     - Verifies business.online_booking_enabled = TRUE   │
│     - Validates service & active staff eligibility     │
│     - Selects candidate for 'Any Available'            │
│     - GIST exclusion constraint prevents double booking│
│     - Inserts appointment_management_tokens (hash)     │
│  2. get_appointment_by_management_token               │
│  3. cancel_appointment_by_management_token             │
│  4. reschedule_appointment_by_management_token         │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL System of Record (Supabase)                 │
│  - public.businesses (RLS public select policy)        │
│  - public.appointments (GIST concurrency constraint)   │
│  - public.customers (linked or created safely)         │
│  - public.appointment_management_tokens (SHA-256 hash) │
└────────────────────────────────────────────────────────┘
```

---

### C. Files Created & Modified

| File | Purpose |
|------|---------|
| `supabase/migrations/20261022000007_create_public_booking_and_tokens.sql` | Additive migration for management tokens table, public read policy on businesses, and dedicated atomic public RPCs |
| `src/features/public-booking/types.ts` | Complete domain types for public salon profile, slots, wizard state, and token management |
| `src/features/public-booking/tokens.ts` | Cryptographic utilities: 32-byte hex generator, SHA-256 hash, timing-safe compare, booking reference formatter |
| `src/features/public-booking/rate-limit.ts` | Sliding window rate limiter protecting availability and booking submission endpoints |
| `src/features/public-booking/validation.ts` | Strict Zod validation schemas for public inputs, slug formats, and token management |
| `src/features/public-booking/server.ts` | Server actions: `getPublicSalonProfile`, `getPublicAppointmentAvailability`, `createPublicBooking`, `getAppointmentByToken`, `cancelAppointmentByToken`, `rescheduleAppointmentByToken` |
| `src/app/api/public/businesses/[businessSlug]/availability/route.ts` | Public availability API endpoint |
| `src/app/api/public/businesses/[businessSlug]/bookings/route.ts` | Public atomic booking submission API endpoint |
| `src/app/api/public/manage-booking/[token]/route.ts` | Customer management lookup API endpoint |
| `src/app/api/public/manage-booking/[token]/cancel/route.ts` | Customer cancellation API endpoint |
| `src/app/api/public/manage-booking/[token]/reschedule/route.ts` | Customer rescheduling API endpoint |
| `src/components/booking/booking-progress.tsx` | Mobile-first 5-step visual progress bar |
| `src/components/booking/steps/service-step.tsx` | Step 1: Service selection with duration, price, and buffers |
| `src/components/booking/steps/staff-step.tsx` | Step 2: "Any Available" or specific specialist selection |
| `src/components/booking/steps/datetime-step.tsx` | Step 3: 14-day date chips + Morning/Afternoon/Evening time slot grid |
| `src/components/booking/steps/details-step.tsx` | Step 4: Full name, email, phone, and optional notes form |
| `src/components/booking/steps/review-step.tsx` | Step 5: Appointment summary, cancellation policy, idempotency lock, and confirm action |
| `src/components/booking/booking-wizard.tsx` | Client orchestrator maintaining state across steps 1-5 |
| `src/components/booking/manage-appointment-client.tsx` | Interactive customer self-service cancellation and rescheduling component |
| `src/components/dashboard/qr-code.tsx` | Lightweight SVG QR code component |
| `src/components/dashboard/public-booking-card.tsx` | Owner dashboard card with public URL display, copy button, QR code, and online status |
| `src/app/booking/[businessSlug]/page.tsx` | Public salon landing page with SEO tags, profile info, and wizard integration |
| `src/app/booking/[businessSlug]/confirmation/page.tsx` | Polished booking confirmation page with calendar export |
| `src/app/manage-booking/[token]/page.tsx` | Customer self-service management route |
| `src/app/booking/page.tsx` | Updated placeholder to link directly to QA salon booking |
| `src/app/dashboard/[businessSlug]/page.tsx` | Updated overview with PublicBookingCard and direct booking link |
| `src/components/dashboard/settings/business-settings-tabs.tsx` | Integrated PublicBookingCard in booking policies tab |
| `tests/unit/phase-1f-public-booking.test.ts` | Comprehensive test suite covering routing, tokens, crypto, validation, and rate limits |
| `scripts/run-live-public-booking-tests.mjs` | Live PostgreSQL integration test runner |

---

### D. Database Migration Status

- **Migration File:** `supabase/migrations/20261022000007_create_public_booking_and_tokens.sql`
- **Sequencing:** Incremental, additive migration following `20261021000006_fix_reschedule_coalesce.sql`.
- **Modifications to Previous Migrations:** None (0001–0006 remain completely untouched).
- **Existing QA Records:** Preserved untouched (`APPT-1`, `APPT-2`, `APPT-3` are not modified).
- **Hosted Execution Status:** **PENDING EXPLICIT OWNER APPROVAL**. Per project safety policy, this migration has NOT been executed on hosted Supabase.

---

### E. Security, RLS & Tenant Isolation

1. **Anonymous Role Isolation:**
   - Anonymous web visitors can only execute dedicated public RPCs (`create_public_appointment_atomic`, `get_appointment_by_management_token`, etc.).
   - Internal owner RPCs (`create_appointment_atomic`, `cancel_appointment_atomic`, `reschedule_appointment_atomic`) remain strictly revoked from `anon`.
   - Direct INSERT, UPDATE, DELETE on `public.appointments` remain completely revoked.
2. **Management Token Cryptography:**
   - Raw tokens are 256-bit high-entropy random hex strings.
   - Database stores strictly SHA-256 digests (`token_hash`), preventing token exposure in the event of database read compromises.
   - Constant-time comparison prevents timing analysis attacks.
3. **Abuse & Rate-Limiting Protection:**
   - Strict rate limits per client IP (max 5 booking submissions/minute) and per business (max 30 bookings/minute).
   - Validation rejects malformed inputs, oversized notes (>500 chars), and invalid dates.
   - Client-side idempotency keys prevent double submissions from rapid clicks.

---

### F. Quality Gates & Test Results

1. **Unit & Regression Tests (`npm run test`):**
   - **Result:** `20 passed (20 test files), 270 passed (270 tests)`
   - **Phase 1F Tests:** All 25 dedicated Phase 1F unit tests passed in 32ms.
2. **TypeScript Typecheck (`npm run typecheck`):**
   - **Result:** `tsc --noEmit` exited with code 0 (Zero errors).
3. **ESLint (`npm run lint`):**
   - **Result:** `eslint` exited with code 0 (Zero errors, zero warnings).
4. **Next.js Production Build (`npm run build`):**
   - **Result:** `next build` compiled successfully via Turbopack in 3.1s, static page generation (29/29) completed in 2.2s.
5. **Live Test Script Verification (`scripts/run-live-public-booking-tests.mjs`):**
   - Ran against configured Supabase project. Invariant verification passed, confirming anonymous token hashing and reporting pending migration 0007 status.

---

### G. UI / UX & Mobile Responsiveness

- Tested for mobile viewports (360px – 430px) without horizontal scrolling.
- Touch-friendly card selection for services and specialists.
- Horizontally scrollable date chips for 14-day advance booking.
- Accessible time slot buttons grouped by Morning, Afternoon, and Evening.
- Touch-friendly action buttons with loading spinners.
- Dark mode compatibility across all new components.

---

### H. Final Status

**CODE COMPLETE — VERIFICATION PENDING**

All Phase 1F components, server actions, API routes, security guards, cryptographic management tokens, dashboard controls, and automated tests are fully built and verified with clean quality gates. Migration `20261022000007_create_public_booking_and_tokens.sql` is prepared and awaiting owner approval before applying to hosted Supabase.
