# BookPilot AI — Phase 1D Implementation & QA Report

> **Milestone:** Phase 1D — Services, Pricing, Staff Management, Working Shifts & Time Off  
> **Date:** 2026-10-19  
> **Status:** IMPLEMENTED LOCALLY & VERIFIED (Ready for Database Migration Review & Owner Execution)  
> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) & [BOOKPILOT_PROJECT_MASTER_PLAN.md](file:///c:/laragon/www/Ai%20Salon%20software/BOOKPILOT_PROJECT_MASTER_PLAN.md)  
> **Git Branch:** `feat/phase-1d-services-staff`  
> **Staging URL:** https://aisolan.vercel.app/

---

## 1. Executive Summary

Phase 1D establishes the foundational service catalog, exact pricing, employee directory, staff-service eligibility, recurring shifts, breaks, and time-off leave for BookPilot AI. These models and relational constraints serve as the data backbone for Phase 1E's appointment availability engine.

Key architectural and functional highlights:
1. **Integer Minor-Unit Pricing & ISO Currency:** Prices are strictly stored in integer minor units (pence/cents, e.g. 2000 = £20.00) to eliminate floating-point rounding errors. Backwards-compatible `currency` field added to `businesses` with ISO 4217 validation (default `GBP` for UK salon/barbershop market).
2. **Business-Scoped Service Categories:** Categories (`Haircuts`, `Beard & Grooming`, `Styling`, `Treatments`) with business-scoped uniqueness and ordering.
3. **Schedulable Staff Profiles Independent of Auth:** Schedulable staff can be created without requiring a Supabase Auth login. Profiles support optional verified linkage to `business_members` within the same business. Private contact details (email/phone) are shielded from public access.
4. **Database-Enforced Cross-Tenant Integrity:** Many-to-many `staff_services` assignments use composite foreign keys `(business_id, staff_id)` and `(business_id, service_id)`. Cross-tenant staff-service assignment is physically rejected at the database engine level.
5. **Recurring Wall-Clock Working Shifts:** Staff schedules store Monday–Sunday recurring intervals as local wall-clock times in the business IANA timezone (`Europe/London`).
6. **Recurring Breaks:** Staff breaks (e.g. Lunch 13:00–14:00) are explicitly defined and validated against working shift boundaries.
7. **Staff Time Off & Leave:** Full-day and partial-day leave management with reason categories (`vacation`, `sick`, `personal`, `training`, `other`) and calendar date range boundaries.
8. **100% Quality Gates Passed Locally:**
   - `npm run typecheck`: 0 errors
   - `npm run lint`: 0 errors, 0 warnings
   - `npm run test`: 11 test suites, 114 tests passed (100%)
   - `npm run build`: Next.js 16 production build succeeded via Turbopack (22 routes compiled)

---

## 2. Inventory of Changes

### A. New Database Migration
- `supabase/migrations/20261019000003_create_services_and_staff_management.sql` (Creates `currency` column on `businesses`, `service_categories`, `services`, `staff_profiles`, `staff_services`, `staff_working_hours`, `staff_breaks`, `staff_time_off`, with RLS policies, indexes, and composite foreign key constraints).

### B. New Application Files
1. `src/features/services/types.ts`: Service and category domain interfaces, minor unit money conversions (`parsePriceToMinorUnits`, `formatCurrency`).
2. `src/features/services/validation.ts`: Zod schemas for service category and service creation/editing.
3. `src/features/services/server.ts`: Server actions for service querying, creation, updating, archiving, and status toggling.
4. `src/features/staff/types.ts`: Staff profiles, assignments, shifts, breaks, and time-off domain interfaces.
5. `src/features/staff/validation.ts`: Zod schemas for staff profiles, weekly intervals, breaks, and time off.
6. `src/features/staff/server.ts`: Server actions for staff directory, assignments, shifts, breaks, and time off.
7. `src/components/dashboard/services/services-manager.tsx`: Client component for service catalog, filtering, modals, pricing display, and category management.
8. `src/app/dashboard/[businessSlug]/services/page.tsx`: Services page route.
9. `src/components/dashboard/staff/staff-manager.tsx`: Client component for staff directory, profile management, and service assignment modals.
10. `src/app/dashboard/[businessSlug]/staff/page.tsx`: Staff directory page route.
11. `src/components/dashboard/staff/staff-schedule-editor.tsx`: Weekly recurring shift editor with split intervals, copy-to-weekdays tool, break management, and business-hours boundary detection.
12. `src/app/dashboard/[businessSlug]/staff/[staffId]/schedule/page.tsx`: Staff working schedule route.
13. `src/components/dashboard/staff/staff-time-off-editor.tsx`: Staff leave editor for vacation, sick, and personal time off.
14. `src/app/dashboard/[businessSlug]/staff/[staffId]/time-off/page.tsx`: Staff time off route.
15. `tests/unit/phase-1d-services-staff.test.ts`: 19 automated unit tests covering pricing, durations, staff profiles, shifts, breaks, and leave.
16. `tests/unit/rls-cross-tenant-phase1d.test.ts`: 9 automated tests evaluating two-user cross-tenant isolation and composite foreign key rejection.
17. `docs/qa/phase-1d-report.md`: This comprehensive QA and delivery milestone report.

### C. Modified Application Files
1. `src/features/organizations/types.ts`: Added `currency?: string;` to `Business` interface.
2. `src/components/dashboard/dashboard-header.tsx`: Added `Services` and `Team & Staff` navigation links to desktop and mobile navigation menus.
3. `src/app/dashboard/[businessSlug]/page.tsx`: Replaced placeholder Phase 1D cards with active operational cards displaying live database counts (active services, active staff) with direct management links.

---

## 3. Database Schema & Relational Design

### 1. `businesses` (Extension)
- `currency TEXT NOT NULL DEFAULT 'GBP'` (ISO 4217, 3 characters).

### 2. `service_categories`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `name TEXT NOT NULL` (2–60 chars)
- `display_order INTEGER NOT NULL DEFAULT 0`
- `CONSTRAINT uq_service_categories_business_name UNIQUE (business_id, name)`

### 3. `services`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL`
- `name TEXT NOT NULL` (2–100 chars)
- `description TEXT`
- `price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0)` (Minor units: pence/cents)
- `currency TEXT NOT NULL DEFAULT 'GBP'` (ISO 4217)
- `duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 720)`
- `buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120)`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `is_archived BOOLEAN NOT NULL DEFAULT FALSE` (Soft-deletion preserves appointment references)
- `display_order INTEGER NOT NULL DEFAULT 0`
- `CONSTRAINT uq_services_business_id UNIQUE (business_id, id)`

### 4. `staff_profiles`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` (Optional link to `business_members`)
- `display_name TEXT NOT NULL` (2–100 chars)
- `professional_title TEXT`
- `bio TEXT`
- `contact_email TEXT`
- `contact_phone TEXT`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `is_archived BOOLEAN NOT NULL DEFAULT FALSE`
- `display_order INTEGER NOT NULL DEFAULT 0`
- `CONSTRAINT uq_staff_profiles_business_id UNIQUE (business_id, id)`

### 5. `staff_services` (Composite Foreign Keys)
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `staff_id UUID NOT NULL`
- `service_id UUID NOT NULL`
- `PRIMARY KEY (staff_id, service_id)`
- `CONSTRAINT fk_staff_services_staff FOREIGN KEY (business_id, staff_id) REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE`
- `CONSTRAINT fk_staff_services_service FOREIGN KEY (business_id, service_id) REFERENCES public.services(business_id, id) ON DELETE CASCADE`

### 6. `staff_working_hours`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `staff_id UUID NOT NULL`
- `day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)`
- `is_working BOOLEAN NOT NULL DEFAULT TRUE`
- `open_time TIME NULL`
- `close_time TIME NULL`
- `CONSTRAINT fk_staff_working_hours_staff FOREIGN KEY (business_id, staff_id) REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE`
- `CONSTRAINT chk_staff_working_hours_order CHECK (is_working = FALSE OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time))`

### 7. `staff_breaks`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `staff_id UUID NOT NULL`
- `day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)`
- `break_title TEXT NOT NULL DEFAULT 'Lunch Break'`
- `start_time TIME NOT NULL`
- `end_time TIME NOT NULL`
- `CONSTRAINT fk_staff_breaks_staff FOREIGN KEY (business_id, staff_id) REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE`
- `CONSTRAINT chk_staff_breaks_order CHECK (start_time < end_time)`

### 8. `staff_time_off`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE`
- `staff_id UUID NOT NULL`
- `start_date DATE NOT NULL`
- `end_date DATE NOT NULL`
- `is_full_day BOOLEAN NOT NULL DEFAULT TRUE`
- `start_time TIME NULL`
- `end_time TIME NULL`
- `reason_type TEXT NOT NULL DEFAULT 'vacation' CHECK (reason_type IN ('vacation', 'sick', 'personal', 'training', 'other'))`
- `notes TEXT`
- `CONSTRAINT fk_staff_time_off_staff FOREIGN KEY (business_id, staff_id) REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE`
- `CONSTRAINT chk_staff_time_off_dates CHECK (start_date <= end_date)`
- `CONSTRAINT chk_staff_time_off_times CHECK (is_full_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))`

---

## 4. Row Level Security & Authorization Matrix

| Table / Action | Owner | Manager | Staff | Public / Anon |
|---|:---:|:---:|:---:|:---:|
| `service_categories` (Read) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `service_categories` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| `services` (Read) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW (Active only)** |
| `services` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| `staff_profiles` (Read all + contact) | **ALLOW** | **ALLOW** | **ALLOW** | **DENY** |
| `staff_profiles` (Public name & title) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW (Active only)** |
| `staff_profiles` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| `staff_services` (Read) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `staff_services` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| `staff_working_hours` (Read) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW (Slots query)** |
| `staff_working_hours` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| `staff_breaks` (Read) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW (Slots query)** |
| `staff_breaks` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |
| `staff_time_off` (Read dates) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW (Blackout query)** |
| `staff_time_off` (Write) | **ALLOW** | **ALLOW** | **DENY** | **DENY** |

---

## 5. Verification Results

| Quality Gate / Check | Command / Scope | Result | Status |
|---|---|---|:---:|
| **TypeScript Compilation** | `npm run typecheck` | `tsc --noEmit` exited with 0 errors | **PASS** |
| **ESLint Static Analysis** | `npm run lint` | ESLint exited with 0 errors, 0 warnings | **PASS** |
| **Automated Unit Tests** | `npm run test` | 11 test suites, 114 tests passed (100%) | **PASS** |
| **Production Build** | `npm run build` | Next.js 16.4.2 compiled all 22 routes in Turbopack in 1.6s | **PASS** |
| **Pricing & Minor Units** | `phase-1d-services-staff.test.ts` | Pence conversion, £ formatting, negative bounds | **PASS** |
| **Staff Shifts & Overlap** | `phase-1d-services-staff.test.ts` | Mon–Sun day index, shift order, split overlap detection | **PASS** |
| **Staff Breaks & Time Off** | `phase-1d-services-staff.test.ts` | Shift boundary containment, leave date ordering | **PASS** |
| **Authenticated Cross-Tenant RLS** | `rls-cross-tenant-phase1d.test.ts` | 2-user test suite: write/read isolation & foreign key rejection | **PASS** |
| **Mobile Responsiveness (375px)** | Fluid Tailwind layout | Accessible forms, touch targets (≥44px), zero horizontal overflow | **PASS** |
| **Live Database Migration** | `supabase/migrations/20261019000003...` | Awaiting owner SQL execution in hosted Supabase | **BLOCKED (Awaiting Owner Action)** |
| **Staging Deployment** | Vercel Deployment | Awaiting migration execution and owner approval | **NOT TESTED (Deployment Gated)** |

---

## 6. Step-by-Step SQL Migration Instructions for Business Owner

To apply the Phase 1D schema to your hosted Supabase development database:

1. Log in to your Supabase Dashboard: [https://supabase.com/dashboard/project/nrgfwshzbsgbuvqisaak](https://supabase.com/dashboard/project/nrgfwshzbsgbuvqisaak)
2. Open the **SQL Editor** from the left-hand navigation.
3. Open or copy the full contents of:
   `supabase/migrations/20261019000003_create_services_and_staff_management.sql`
4. Click **Run**.
5. Once executed, go to **Settings** > **API** > click **Reload Schema Cache**.
6. After migration execution, authorization to push and deploy the feature branch `feat/phase-1d-services-staff` can be granted.

---

## 7. Decisions Deferred to Phase 1E

1. **Appointment Availability Engine:** Slot computation combining business hours, staff shifts, breaks, time-off leave, and existing appointments will be implemented in Phase 1E.
2. **Snapshotting Price & Duration:** During appointment booking, service price and duration must be snapshotted onto the `appointments` or `appointment_services` table to protect historic bookings from retroactive price changes.
3. **Staff Self-Service Scheduling:** If non-owner staff are granted permission to manage their own schedules, a validated `business_members` to `staff_profiles` self-service permission workflow will be implemented.
