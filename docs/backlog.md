# BookPilot AI — Product Backlog & Detailed User Stories

> **Document Version:** 1.0  
> **Phase:** Phase 0 (Discovery & Specification)  
> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) Section 4, 14 & [BOOKPILOT_PROJECT_MASTER_PLAN.md](file:///c:/laragon/www/Ai%20Salon%20software/BOOKPILOT_PROJECT_MASTER_PLAN.md) Section 5, 11

---

## 1. Phase-by-Phase Roadmap Summary

| Phase | Milestone Name | Priority | Core Objective | Gate Criteria |
|---|---|:---:|---|---|
| **Phase 0** | Discovery & Architectural Foundation | **P0** | Complete architectural design, ERD, RBAC matrix, test plans, and backlog. | Architecture approved; zero unverified dependencies. |
| **Phase 1** | Core Booking SaaS Foundation | **P0** | Multi-tenant auth, business onboarding, staff/service schedules, collision-safe booking engine, mobile booking page, dashboard, notifications. | Non-AI booking works end-to-end on mobile & web; concurrency tests pass; zero double-booking bugs. |
| **Phase 2** | Tool-Using AI Website Receptionist | **P1** | Conversational chat widget, deterministic server tool adapter, intent parsing, appointment rescheduling, handoff, automated evaluation suite. | AI reliably creates/changes bookings via tools with 0% unverified confirmations. |
| **Phase 3** | WhatsApp Text Integration | **P1** | Official Meta Cloud API onboarding, webhook signatures, conversation mapping, notifications, HSM templates. | Inbound/outbound text booking verified in provider sandbox. |
| **Phase 4** | Live Telephone AI Voice Pilot | **P2** | Realtime voice streaming, telephony gateway, voice booking tools, spoken consent, interruption handling, cost metering. | Live inbound phone call successfully confirms real booking in test environment. |
| **Phase 5** | Commercialization & Multi-Location | **P2/P3** | Verified SaaS subscription billing, usage limits, client deposits, Google Calendar two-way sync, analytics. | Verified payment webhooks, automated plan provisioning, owner sign-off. |

---

## 2. Granular User Stories & Acceptance Criteria

### Milestone 1: Tenant Management & Authentication (Phase 1 — P0)

#### Story `US-AUTH-01`: Salon Owner Registration & Workspace Creation
- **Persona:** Prospective Salon Owner
- **User Story:** As an independent salon or barbershop owner, I want to create an account and define my business workspace so that I can configure my salon's booking system.
- **Priority:** P0 (Core Foundation)
- **Acceptance Criteria:**
  - **Given** an unauthenticated visitor on `/register`,
  - **When** they submit valid email, password, full name, and business name,
  - **Then** a Supabase Auth user is created, an `organizations` row is inserted with a URL-safe unique `slug`, and an `organization_memberships` record is assigned with role `business_owner`.
  - **And** duplicate emails or invalid password formats return clear error messages.
  - **And** a verification email is dispatched.

#### Story `US-AUTH-02`: Tenant Scoping & Multi-Tenancy Isolation
- **Persona:** Business Owner
- **User Story:** As a business owner, I want to ensure my salon data cannot be accessed, modified, or viewed by any other business on the platform.
- **Priority:** P0 (Security Critical)
- **Acceptance Criteria:**
  - **Given** an authenticated user belonging to Salon A,
  - **When** they attempt to query API endpoints or mutate records belonging to Salon B (via ID tampering),
  - **Then** the request is rejected with `403 Forbidden` or `404 Not Found`.
  - **And** automated integration tests confirm database RLS prevents cross-tenant leaks.

---

### Milestone 2: Salon Configuration & Schedules (Phase 1 — P0)

#### Story `US-CFG-01`: Location & Operating Hours Setup
- **Persona:** Business Owner / Manager
- **User Story:** As an owner, I want to set up my physical salon address, IANA timezone, opening/closing hours, and booking rules (lead time, advance window, cancellation window).
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** an authenticated owner in `/dashboard/settings`,
  - **When** they update location details, specify weekly hours (e.g., Monday-Saturday 09:00–18:00), timezone (`Europe/London`), and 24-hour cancellation deadline,
  - **Then** changes are stored in `locations` and `working_hours`.
  - **And** closing times earlier than opening times are rejected with validation errors.

#### Story `US-CFG-02`: Services & Staff Capabilities Management
- **Persona:** Business Owner
- **User Story:** As an owner, I want to define services with durations, prep/cleanup buffers, and assign qualified staff members so that clients can book accurate time blocks.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** an owner in `/dashboard/services`,
  - **When** they create a service "Haircut & Beard Sculpt" (45 mins, £35, 5 min buffer after) and assign staff members "Alex" and "Marco",
  - **Then** records are saved in `services` and `staff_services`.
  - **And** service duration must be greater than zero.

#### Story `US-CFG-03`: Staff Working Shifts, Breaks & Time-Off
- **Persona:** Business Owner / Staff Member
- **User Story:** As a salon manager, I want to configure individual staff shifts, recurring lunch breaks, and holiday time-off so that unavailable staff cannot be booked.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** a staff member with regular shift 10:00–19:00 and break 13:00–14:00,
  - **When** an approved time-off record is added for October 25th,
  - **Then** no booking slots are generated for that staff member during the break or on October 25th.

---

### Milestone 3: Real-Time Availability & Concurrency Engine (Phase 1 — P0)

#### Story `US-BKG-01`: Conflict-Free Real-Time Slot Calculation
- **Persona:** Customer / Public Client
- **User Story:** As a client, I want to see real-time available time slots for a chosen service and date, taking into account salon opening hours, staff working hours, breaks, existing bookings, and buffers.
- **Priority:** P0 (Core Algorithm)
- **Acceptance Criteria:**
  - **Given** a customer viewing `/booking/[slug]`,
  - **When** they pick date `2026-10-24` and service "Haircut" (30 mins),
  - **Then** the server calculates available slots by subtracting working shifts − breaks − active appointments − buffers.
  - **And** all calculations occur in the business's IANA timezone and return UTC timestamps.
  - **And** slots within the minimum lead time (e.g., less than 2 hours away) are omitted.

#### Story `US-BKG-02`: Race Condition & Atomic Conflict Prevention
- **Persona:** Customer / System
- **User Story:** As a business owner, I want to guarantee that if two clients attempt to confirm the exact same slot simultaneously, only one succeeds and the other receives a conflict notification.
- **Priority:** P0 (Zero Double-Booking Guarantee)
- **Acceptance Criteria:**
  - **Given** two simultaneous booking requests for Staff A on `2026-10-24 14:00–14:30`,
  - **When** both transactions hit the database concurrently,
  - **Then** PostgreSQL exclusion constraint (`EXCLUDE USING gist`) or atomic lock permits exactly ONE appointment to commit with status `confirmed`.
  - **And** the second request receives an HTTP `409 Conflict` with error code `SLOT_UNAVAILABLE` and suggestions for alternate slots.

#### Story `US-BKG-03`: Idempotent Booking Creation
- **Persona:** Customer
- **User Story:** As a customer experiencing network dropouts, I want to ensure that re-submitting my booking request does not generate duplicate appointments.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** a booking request sent with an `idempotency_key`,
  - **When** the client retries the request with the identical key within 24 hours,
  - **Then** the server returns the existing confirmed booking without creating a second record.

---

### Milestone 4: Customer Mobile Booking & Management (Phase 1 — P0)

#### Story `US-MOB-01`: Fast Mobile-First Booking Journey
- **Persona:** Customer on Mobile Device
- **User Story:** As a customer on a smartphone, I want a frictionless 4-step booking flow: Service → Staff (optional) → Date/Time → Details → Confirm.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** a mobile viewport (320px–390px width),
  - **When** a user navigates `/booking/[slug]`,
  - **Then** steps load smoothly with high contrast, legible typography, clear pricing, and no horizontal layout overflow.
  - **And** forms pass WCAG AA accessibility standards with keyboard and screen reader labels.

#### Story `US-MOB-02`: Tokenized Booking Rescheduling & Cancellation
- **Persona:** Customer
- **User Story:** As a customer, I want to cancel or reschedule my appointment via a secure link from my confirmation email without needing to remember a password.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** a customer accessing `/booking/[slug]/manage?token=<signedToken>`,
  - **When** they click "Cancel Appointment" before the cancellation deadline (e.g. >24h notice),
  - **Then** the appointment status transitions to `cancelled`, staff schedule frees up instantly, and an audit event is logged.
  - **And** if attempted past the deadline, cancellation is blocked with a notice instructing them to contact the salon directly.

---

### Milestone 5: Notifications & Dashboard (Phase 1 — P0)

#### Story `US-NOTIF-01`: Reliable Transactional Confirmation & Reminder Emails
- **Persona:** Customer & Business Owner
- **User Story:** As a customer, I want to receive an email confirmation immediately upon booking, and an automated 24-hour reminder before my appointment.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** a successfully committed appointment,
  - **When** the transaction completes,
  - **Then** a notification job is queued for immediate dispatch via Resend.
  - **And** if the email provider fails temporarily, the booking remains safe and a background job retries delivery up to 3 times with exponential backoff.

#### Story `US-DASH-01`: Daily Salon Schedule & Manual In-Person Booking
- **Persona:** Receptionist / Salon Owner
- **User Story:** As a receptionist, I want to view today's appointments across all staff and manually add walk-in or phone appointments.
- **Priority:** P0
- **Acceptance Criteria:**
  - **Given** an authenticated user in `/dashboard`,
  - **When** they open the daily view,
  - **Then** all appointments for the current date are displayed chronologically with status tags.
  - **And** clicking "New Appointment" enables manual booking adhering to identical conflict and schedule rules.

---

### Milestone 6: AI Receptionist Web Chat (Phase 2 — P1)

#### Story `US-AI-01`: Deterministic Tool Calling for Availability Queries
- **Persona:** Website Visitor
- **User Story:** As a prospective client chatting with the AI widget, I want to ask for available times in natural language (e.g., "Any openings for a skin fade this Friday after 4pm?") and receive accurate slots.
- **Priority:** P1
- **Acceptance Criteria:**
  - **Given** a user message in the AI chat widget,
  - **When** the LLM identifies booking intent,
  - **Then** it triggers the deterministic tool `check_availability` with structured parameters.
  - **And** the model responds strictly with real slots returned by the server.
  - **And** if no slots exist, the AI offers the closest alternatives rather than fabricating times.

#### Story `US-AI-02`: Mandatory Confirmation Before Booking Mutation
- **Persona:** Customer & System
- **User Story:** As an owner, I want the AI receptionist to explicitly confirm service, staff, date, time, and price with the customer before creating any booking.
- **Priority:** P1
- **Acceptance Criteria:**
  - **Given** a customer expressing a slot preference,
  - **When** the AI receives the choice,
  - **Then** it must present a summary and ask for explicit confirmation (e.g. "Should I confirm this for you?").
  - **And** the write tool `create_booking` is invoked only after the customer confirms.
  - **And** every tool invocation is audited in `ai_tool_audits`.

---

## 3. Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
A backlog item is ready for implementation only when:
1. User story is clearly stated with business value.
2. Acceptance criteria are written in Given/When/Then format.
3. Database and API impact are documented.
4. Security and tenant isolation rules are identified.
5. Verification method (Unit, Integration, E2E) is defined.

### Definition of Done (DoD)
A backlog item is marked complete only when:
1. Implementation matches architectural patterns defined in `docs/architecture.md`.
2. TypeScript types are strict; zero lint or type check errors.
3. Unit tests cover availability and edge cases; integration tests verify database constraints.
4. Tenant isolation is verified (no cross-organization data access).
5. Mobile responsive check completed (320px–390px).
6. Evidence report delivered in accordance with Section 13/15 of `AGENTS.md`.
