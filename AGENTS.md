# AGENTS.md — AI Appointment Booking & Receptionist SaaS

> Instructions for Google Antigravity and any AI coding agent working in this repository.
> Project codename: **BookPilot AI** (placeholder; not a confirmed brand/domain).
> Last updated: 2026-10-18.

## 1. Mission and operating rules

Build a secure, mobile-first, **multi-tenant appointment-booking SaaS** that can serve salons and barbershops first, then other appointment-based service businesses without rewriting the booking core. The university FYP must demonstrate meaningful engineering and an explainable, tool-using AI receptionist. The commercial product must deliver genuine operational value, not merely an LLM chat interface.

**Roles:** The product owner / ChatGPT supplies final scope, editorial copy, product decisions, acceptance criteria, and approved implementation prompts. **Antigravity is the implementation and QA executor**: inspect the codebase, propose a short execution plan, implement the authorized scope, write tests, and report evidence. Do not independently invent features, pricing, brand claims, SEO content, legal policies, or external integration credentials.

### Non-negotiable agent behavior
- Read this file, `README.md`, existing architecture documentation, package scripts, database schema, and relevant implementation files **before making changes**.
- Prefer maintaining established patterns over introducing a new framework. Avoid unnecessary rewrites, dependencies, and migrations.
- Implement tasks in small, reviewable steps. Before editing, state affected modules, risks, and the verification plan.
- Never claim an integration works unless it has been tested with its actual provider or clearly identified sandbox/mock. Distinguish **implemented**, **tested with mocks**, **verified in sandbox**, and **verified in production**.
- Never invent API responses, business metrics, customers, prices, test results, or provider eligibility.
- Do not ask for or expose secrets in chat, commit credentials, log raw tokens, or insert real customer data into prompts.
- Do not deploy to production, alter billing, execute irreversible migrations, send messages/calls to real customers, or enable live AI actions without explicit owner approval.
- Do not let an AI agent bypass application authorization, booking rules, payment verification, or confirmation requirements.
- If requirements conflict, prioritize tenant isolation, data safety, booking correctness, and explicit owner instructions. Report unresolved blockers.
- Work on a feature branch where possible; do not simultaneously edit the same files as another coding agent. Do not force-push.

## 2. Product and target audience

**First launch niche:** Independent barbershops and hair salons with approximately 1–10 staff, initially validating a single international market. **Future niches:** Spas, nail studios, tutors, trainers, consultants, car-detailing businesses. Keep the domain model configurable rather than hard-coding salon assumptions in foundational services.

### User roles
1. **Platform admin:** Platform health and subscription administration with audited, tightly controlled access.
2. **Business owner:** Organization setup, locations, staff, services, settings, billing, analytics.
3. **Manager/receptionist:** Manage permitted bookings, customer inquiries, staff schedules.
4. **Staff member:** View and manage only authorized assignments/availability.
5. **Customer:** Public booking, status lookup via secure link or authenticated verification, authorized changes.

### Major channels
- **P0:** Mobile-first public booking site; owner/staff dashboard; email confirmations.
- **P1:** Website AI chat receptionist; approved WhatsApp Business **messaging** integration.
- **P2:** Regular phone AI receptionist through an authorized telephony/SIP provider and suitable realtime voice infrastructure.
- **Conditional P3:** WhatsApp **calling** only after verified provider/account/region support. Never assume WhatsApp messaging access enables WhatsApp calls.

Every channel uses the **same backend booking engine and database**; channel-specific connectors must not have separate booking logic.

## 3. Default technical architecture

Use this stack unless the repo already has an approved alternative:
- **Frontend and app APIs:** Next.js App Router, React, TypeScript.
- **UI:** Tailwind CSS, shadcn/ui where appropriate; responsive and accessible.
- **Database:** PostgreSQL, hosted on Supabase; SQL migrations in source control.
- **Authentication:** Supabase Auth or already-established auth provider.
- **Authorization:** Server-side roles, organization membership checks, database Row Level Security when using Supabase client access.
- **AI:** Server-side model API with structured tool/function calling. Provider integration behind an adapter interface.
- **Notifications:** Email provider (e.g. Resend) plus reliable background-job service for reminders/retries.
- **Hosting:** Vercel for the web app; a separately hosted persistent worker/voice gateway where needed.
- **Repository:** GitHub; reviewed PRs and CI.
- **Payments:** Approved SaaS subscription provider only after owner sets up and validates merchant eligibility. Salon customer deposits are a **separate merchant/payment flow** and are not part of P0.
- **Monitoring:** Structured error reporting, safe audit events, provider failure alerts.

Do not implement long-lived realtime voice sessions as if ordinary short-lived serverless requests could sustain them. Do not assume Google Calendar is required: the application-owned booking calendar is the system of record; external calendar sync is optional.

## 4. Suggested feature modules

Prefer modular domain folders; adapt to actual repository conventions:

```text
src/
  app/
    (marketing)/
    (auth)/
    dashboard/
    booking/[businessSlug]/
    api/
  features/
    organizations/
    locations/
    staff/
    services/
    schedules/
    bookings/
    customers/
    notifications/
    ai-receptionist/
    integrations/
      whatsapp/
      calendar/
      telephony/
    billing/
    analytics/
  lib/
  server/
supabase/migrations/
tests/
docs/
```

Avoid duplication between UI actions, agent tools, webhooks, and scheduled jobs: all must call shared, authorized domain services.

## 5. Data model: minimum entities

- `users`, `organizations`/`businesses`, `organization_memberships`, `roles`
- `locations`, `staff`, `staff_services`, `services`, `resources`
- `working_hours`, `breaks`, `time_off`, `booking_policies`
- `customers`, `customer_contact_consents`
- `appointments`, `appointment_services`, `appointment_events`, `booking_holds` (if needed)
- `notifications`, `notification_attempts`, `integrations`, `integration_events`
- `ai_conversations`, `ai_tool_audits`, `human_handoffs`
- `subscription_accounts`, `subscription_events`, `usage_counters`
- `audit_logs`

All tenant-owned rows must belong to a verified `organization_id`; location-bound rows must have consistent organization ownership. Unique constraints, foreign keys, indexes, and database policies must be enforced. Do not assume filtering in client JavaScript provides tenant isolation.

Protect personally identifiable information; minimize retention of transcripts. Implement deletion/export workflows as required by the deployment jurisdiction.

## 6. Booking-engine correctness — highest priority

### Supported rules
- Business and location timezone using IANA zone identifiers; store appointment timestamps in UTC and display in local time.
- Business hours, staff shifts, breaks, time off, holidays, service eligibility.
- Service durations, preparation/cleanup buffers, multiple services, optional required rooms/equipment.
- Minimum notice, maximum advance booking horizon, cancellation/rescheduling windows.
- Manual receptionist bookings and public/AI bookings obey the **same rules**.
- Appointment states: pending/held (if applicable), confirmed, completed, cancelled, no-show; transitions must be validated and audited.
- Idempotency keys for booking creation, webhook processing, and retries.

### Booking lifecycle
1. Validate tenant and service/staff/resource eligibility.
2. Interpret request date in business timezone and resolve relative times using a reliable clock.
3. Calculate real availability from schedules, existing appointments, buffers, and resources.
4. Present feasible alternatives when the requested slot is unavailable.
5. Collect necessary customer details and obtain explicit confirmation.
6. **Re-check availability on the server immediately before booking.**
7. Commit through atomic database transaction with concurrency-safe reservation logic (e.g., suitable PostgreSQL exclusion constraints/locks); never trust client-side or LLM checks alone.
8. Record event, schedule confirmation/reminder notifications, and return a real booking identifier only after successful commit.
9. Handle duplicates, conflicts, timeouts, retries, timezone changes, and notification failures safely.

Acceptance tests must prove that two simultaneous requests **cannot confirm the same conflicting staff/resource timeslot**.

## 7. AI receptionist — tool-using but constrained

The model **interprets language and decides which authorized tools to request**. Deterministic backend services perform all business actions.

Suggested tool interfaces (names are illustrative):

```ts
get_business_info({ organizationId })
list_services({ organizationId, locationId })
list_eligible_staff({ organizationId, serviceId })
check_availability({ organizationId, locationId, serviceIds, staffId?, dateRange })
create_booking({ organizationId, customerContext, serviceIds, staffId?, slot, confirmationToken, idempotencyKey })
get_booking({ organizationId, bookingId, verifiedCustomerContext })
reschedule_booking({ organizationId, bookingId, newSlot, verifiedCustomerContext, confirmationToken })
cancel_booking({ organizationId, bookingId, verifiedCustomerContext, confirmationToken })
get_booking_policy({ organizationId, locationId })
escalate_to_human({ organizationId, conversationId, reason })
```

### AI safety and UX rules
- Never guess availability, service prices, policies, staff eligibility, or confirmed booking status. Fetch them from trusted backend tools.
- Require the user's explicit confirmation before creating, rescheduling, or cancelling an appointment.
- Verify identity/ownership before disclosing or changing existing appointments; possession of a name alone is insufficient.
- Prevent cross-tenant references and prompt-injection attempts from customer messages or external content.
- Use structured, validated tool arguments (schemas). Enforce limits, request timeouts, retries, and safe fallbacks.
- If intent is unclear, ask a brief clarifying question. If booking fails, explain without falsely claiming success.
- Offer human handoff for complaints, uncertain requests, unsupported services, sensitive cases, or repeated tool failures.
- Clearly disclose when users are interacting with an AI assistant where appropriate.
- Evaluate intent extraction, successful tool use, false confirmations, handoff correctness, latency, cost and adversarial scenarios.

## 8. Messaging, calls, and reminders

### Website and email — P0/P1
- Public booking flow must work even if the AI service is down.
- Queue confirmations/reminders via background jobs; track delivery failures and retries.
- Handle unsubscribe/notification preferences as appropriate.

### WhatsApp text messages — P1
- Use **official** WhatsApp Business Platform or an authorized provider.
- Require business-specific onboarding and authorization. Merely entering a phone number is insufficient.
- Verify webhook signatures where supported; deduplicate events; map incoming messages to the correct tenant/channel.
- Observe message windows, approved template requirements, opt-in/consent, pricing and business messaging policies.
- Route booking actions through shared backend tools.

### Regular phone calls — P2
- Use a supported telecom/SIP gateway and a persistent realtime audio/agent service.
- Handle interruptions, silence/timeouts, speech recognition errors, noise, number verification, caller transfer and escalation.
- Respect jurisdiction-specific consent, recording, privacy and calling laws.
- A caller must never hear booking success until the booking transaction succeeds.

### WhatsApp calls — conditional P3
- First verify official account/provider feature eligibility, territory support and compatible calling interfaces.
- Keep separate from WhatsApp chat implementation; do not promise universal support.

## 9. Commercial readiness and billing

The SaaS owner's monthly subscription is **not** the salon customer's appointment deposit. Keep these distinct in code and product copy.

- Support trials, plans, feature flags/limits, metered AI/telephony usage, billing statuses, cancellations and upgrades.
- Only activate paid entitlements from **verified** payment-provider events, not a checkout redirect URL.
- Verify webhooks and implement idempotent processing.
- Establish limits on AI tokens, call minutes and messaging costs; avoid unlimited-cost plans.
- Do not use unapproved payment providers or invent account eligibility. Production billing requires explicit approval.

## 10. UX and accessibility

- Mobile-first customer booking must be fast and short: **Service → Staff (optional) → Date/Time → Details → Confirm**.
- Make prices, durations, timezones, cancellation policy and booking confirmation unmistakable.
- WCAG-conscious forms: accessible labels, keyboard support, focus states, error text and contrast.
- Show empty/loading/error states. Do not hide booking failures.
- Dashboard should prioritize today's appointments, staff view, upcoming bookings, customer lookup and manual add booking.
- Business owner can customize business name, logo, services and policies; keep core flows consistent across tenants.

## 11. SEO and public pages

The owner/ChatGPT supplies finalized copy and SEO decisions; Antigravity implements them exactly. Build crawlable marketing pages and performant booking landing pages. Avoid indexable private dashboards and thin auto-generated location/industry pages. Never fabricate testimonials, schema reviews, customer counts or ranking claims. Only emit structured data consistent with visible facts and applicable standards.

## 12. Security and privacy checklist

- No real secrets in git, frontend bundles, prompt text or screenshots. Use environment variables and secret management.
- Use least-privilege provider credentials and restricted development keys.
- Strong input validation on all endpoints and AI tool calls.
- Tenant isolation tests at API and database levels; no cross-organization queries by manipulating IDs.
- Role checks for every privileged action. Audit appointment changes and AI-triggered actions.
- CSRF/session protection, rate limiting, abuse detection, secure headers and controlled file uploads as applicable.
- Encrypt sensitive tokens at rest, rotate when compromised, and provide integration disconnect/revoke paths.
- Backup and restore procedures tested before onboarding paying customers.
- Recording and transcript retention disabled or minimized by default; obtain required user notices and consent.
- No production credentials or customer data supplied to external AI agents without explicit authorization.

## 13. Quality gates and definition of done

For every task, provide:
1. Short summary and exact files changed.
2. Dependencies, migrations, environment variables and external-console actions required (without secret values).
3. Tests added/updated and **actual commands/results**.
4. Security and tenant-isolation considerations.
5. UX/mobile checks and screenshots if available.
6. Known limitations, mocks, unverified assumptions and remaining manual steps.

Minimum recommended checks, adapted to repository scripts:
- Type check and lint pass.
- Unit tests for availability, booking policies and timezone conversion.
- Integration tests for database constraints, tenant authorization and webhooks.
- E2E tests for signup, business setup, public booking, cancellation and rescheduling.
- Concurrency test for simultaneous attempts at one appointment slot.
- AI tool tests including unknown times, prompt injection, permission denial and failed booking.
- Responsive checks at common small-screen widths.
- Production build succeeds before any release proposal.

Do not mark a feature complete if a required integration is still mocked. Clearly state mock-only status.

## 14. Delivery phases — implement in order

**Phase 0 — Discovery and specification:** Audit existing repository; write `docs/architecture.md`, ERD, role/permission matrix, user stories, acceptance criteria. Ask owner about truly blocking business rules; otherwise use explicit, changeable defaults.

**Phase 1 — Booking foundation (P0):** Auth, tenants, roles, onboarding, locations, staff, services, schedules, real-time availability, transaction-safe booking, public mobile booking page, manual staff bookings, email confirmation.

**Phase 2 — FYP AI receptionist (P1):** AI website chat, structured agent tools, explainable tool audit trail, rescheduling/cancellation, safe handoff, evaluation suite.

**Phase 3 — Messaging integrations (P1/P2):** Official WhatsApp text onboarding/webhooks/templates; notification rules and monitoring. Provider sandbox first.

**Phase 4 — Voice pilot (P2):** Regular telephone AI gateway, realtime audio, voice tool calls, escalation, consent, metering, performance tests. Only after booking backend is stable.

**Phase 5 — Commercialization (P2/P3):** Approved subscription billing, trials and usage limits, optional external calendar sync, analytics, deposits via salon-controlled payment rails, multi-location and advanced retention.

Do not implement Phase 4/5 speculatively when Phase 1 correctness or tenant security remains incomplete.

## 15. Standard implementation response format

At the beginning of a task, reply with:

```text
TASK UNDERSTANDING
- Requested scope:
- Existing files/systems to inspect:
- Proposed implementation steps:
- Expected risks and dependencies:
- Verification plan:
```

At completion, reply with:

```text
IMPLEMENTATION REPORT
- Status: complete / partial / blocked
- Files changed:
- Database migrations:
- External configuration required:
- Tests run and actual results:
- Security and tenant checks:
- Screens/flows verified:
- Remaining issues / blockers:
- Deployment: not performed unless explicitly approved
```

**First action on receiving this file:** Audit the existing repository and report what already exists versus what must be created. Do not overwrite an existing app or invent missing provider credentials. Begin Phase 0 or the owner's explicitly assigned task only.
