# BookPilot AI — FYP & SaaS Master Project Documentation

**Version:** 1.0 | **Date:** 18 October 2026 | **Status:** Planning baseline — not evidence of implementation  
**Working name:** BookPilot AI (placeholder; name/domain unverified)  
**Companion instruction file:** `AGENTS.md` — source of rules for Antigravity implementation.  
**Audience:** Project owner, FYP supervisor, Cursor/Antigravity coding agents, future QA and pilot users.

> **Project mission:** Build a secure, mobile-first, multi-tenant appointment booking and AI receptionist SaaS. Begin with independent barbershops and small hair salons (approximately 1–10 staff), with a configurable core that can later serve spas, tutors, fitness coaches and other appointment-based businesses. The FYP must include real engineering evaluation; the business must solve a repeatable operational problem.

## 1. Executive decisions and boundaries

| Decision | Agreed direction | Status |
|---|---|---|
| Business model | One hosted SaaS, many independently managed client accounts; recurring subscriptions | Agreed |
| Initial niche | Barbershops and small hair salons | Agreed |
| Initial geography | Validate one market first; UK is a candidate, **not confirmed** | Research pending |
| Customer channels | Public booking website first; AI website chat; WhatsApp messaging; regular telephone voice later | Agreed roadmap |
| WhatsApp calling | Conditional only after provider/account/region capability is verified | Not committed |
| Calendar | Built-in booking DB is source of truth; Google Calendar optional sync | Agreed |
| AI | Use existing model APIs with controlled tool calling; do not train a foundation model | Agreed |
| Coding workflow | ChatGPT specifies; Cursor/Antigravity implement and QA; owner approves sensitive changes | Agreed |
| Hosting and backend | Next.js, PostgreSQL/Supabase, Vercel, background workers | Proposed default |
| Money flows | SaaS subscriptions separate from salon-customer booking deposits | Agreed |
| Brand / final pricing | Name, domain and price tiers are illustrative | Not decided |

### Explicitly out of scope for initial MVP
A full POS, inventory, payroll, marketplace discovery network, bulk marketing, medical records, multi-country tax engine, guaranteed booking uplift, automated voice calls, WhatsApp calling, and unsupervised customer account changes. These may be explored separately only after the earlier gates pass.

## 2. Target customers and value proposition

**Primary ideal customer profile:** Owner-operated barber shop or salon with 1–10 staff, recurring time-based appointments, a website/social profile, and manual or fragmented booking management. The buyer is typically the owner/manager. End users are staff and customers booking services.

**Problems worth testing:** missed inquiries outside opening hours; double bookings; staff schedule changes; administrative calls; no-shows; late cancellations; difficulty identifying returning customers. These are *hypotheses* until interviews and pilots validate frequency and willingness to pay.

**Differentiation hypothesis:** A trustworthy booking engine plus multi-channel AI receptionist that can answer questions, check *actual* openings, request confirmation, create or modify authorized bookings, and transfer to staff. It should be substantially simpler for small businesses than a large salon suite. Compete on workflow and service, not just low price or a chatbot badge.

**International-market considerations:** business timezone and daylight saving; configurable currency, locale, phone formats and service prices; consent/privacy rules; local SMS/voice/WhatsApp eligibility; provider onboarding; accessibility; customer support hours; payment-provider merchant approval.

## 3. User roles and permissions

| Role | Allowed tasks | Must not be allowed |
|---|---|---|
| Platform admin | Support platform operations and subscriptions with audited privileged access | Unlogged unrestricted tenant/customer browsing |
| Business owner | Business settings, staff, services, schedules, subscriptions, analytics | Access another tenant's data |
| Manager/receptionist | Authorized appointments, staff operations, customer inquiries | Global billing/admin privileges unless delegated |
| Staff member | Assigned schedule and permitted appointment details | Other businesses' records and owner-only billing |
| Customer/guest | Browse services, request appointments, manage own verified bookings | Guess another customer's booking ID and modify it |
| AI agent | Only whitelisted server tools in scoped business/customer context | Arbitrary SQL, secret exposure, irreversible unconfirmed actions |

**Key rule:** Every server endpoint validates identity, role and tenant. Row Level Security where applicable is defense in depth, not a substitute for endpoint authorization.

## 4. End-to-end user journeys

### Journey A — business owner starts using SaaS
1. Visit landing page; view industry-specific demo and plan terms.
2. Create account and verify email; choose business name, country, timezone and locale.
3. Create business workspace and first location; set opening hours and policies.
4. Add staff, services, service durations, price, breaks, buffers and time off.
5. Preview mobile booking page, make a test reservation, verify staff calendar.
6. Publish/share booking link (example: `/booking/modern-cuts`).
7. Invite staff with scoped roles. In the commercial version, activate plan after verified billing event.
8. Review calendar, notifications, failures and basic metrics in dashboard.

### Journey B — customer books through website
1. Open public page; select service(s), optionally preferred staff, date and available slot.
2. Server computes eligibility: business hours + working shifts − breaks/leave/existing bookings − buffers/resources.
3. Show accurate price, duration, address, cancellation policy and deposit requirement if configured.
4. Collect minimum contact info; obtain appropriate notification consent.
5. Revalidate under a transaction/concurrency-safe reservation constraint; confirm only if still available.
6. Save appointment and state transition; queue confirmation and reminder jobs.
7. Provide booking reference and secure management link. Log delivery success/failure.

### Journey C — AI website receptionist
Customer: “I want a haircut and beard trim this Saturday after 5 with James.”  
Agent: parses intent, salon timezone, service and staff; calls `get_services`, `check_availability`; offers only backend-returned slots; displays full cost/duration; asks for explicit customer confirmation; calls `create_booking` with authorized scoped token; responds with *confirmed* booking only after backend success; queues notification. If slots disappear during confirmation, offers alternatives. Unknown policies or failed identity verification → human handoff.

### Journey D — WhatsApp text
Customer messages a connected official WhatsApp business number → verified inbound webhook → map to correct tenant → scoped AI conversation → real backend availability/tool calls → explicit confirmation → send response within applicable platform policy, template and consent rules. An ordinary typed WhatsApp number is **not** an integration. Business/account onboarding, provider authorization and regional permissions are required.

### Journey E — regular telephone AI (later phase)
Customer calls a provisioned/forwarded phone number → authorized telephony/SIP gateway → realtime streaming voice service → speech AI and scoped booking tools → clarification, consent and spoken confirmation → database booking → call outcome log and optional written confirmation. Include interruption handling, low-confidence speech, human transfer, disconnections, recording notices, and usage metering. Not implemented by an ordinary short-lived Vercel HTTP request alone.

### Journey F — change or cancel appointment
Secure management link or verified identity → retrieve only customer's booking → check business cancellation rules → calculate eligible action → explicitly confirm → transactionally change status/time and notify impacted customer/staff; retain audit history. Never allow booking lookup by easily guessed reference alone.

## 5. Core functional requirements and priorities

**P0 — must work before pilots:**
- Email authentication, secure sessions, tenant setup and owner role.
- Business/location profiles, timezone, opening/holiday hours, cancellation policy.
- Staff, services, durations, optional buffers, staff-service eligibility, shifts, leave.
- Mobile-first public booking page; live available slots; booking create, manual create, list, cancel and reschedule.
- Collision-safe booking, idempotent booking requests and audit records.
- Customer profiles, essential contact records and privacy controls.
- Email confirmations and scheduled reminders with durable background jobs.
- Owner/staff calendar; basic booking status analytics; error monitoring.

**P1 — AI FYP:**
- Website AI chat integrated into *the same* booking engine.
- Intent and structured slot parsing, tool calls, user confirmation, refusal/handoff.
- AI conversation audit and evaluation harness.
- Official WhatsApp **text** messaging integration, only after provider onboarding, permissions and sandbox tests.

**P2 — commercial/advanced:**
- Regular phone AI receptionist through approved voice provider.
- Customer deposits using salon-owned approved payment accounts (not SaaS subscription merchant funds).
- Waitlist and cancellation-fill recommendations, optional Google Calendar sync.
- No-show reporting, rebooking/retention tools, message quotas, AI usage metering.

**P3 — later/conditional:**
- WhatsApp *calls* only if verified available; packages/memberships, multiple branches, advanced resource management, custom domains and specialized vertical workflows.

## 6. Booking engine rules (non-negotiable)

- Each service has duration, optional prep/cleanup buffer, price/currency and eligible staff/resources.
- Working shifts, opening hours, breaks, leave, holidays, lead time, booking horizon and cancellation deadlines affect availability.
- Store timestamps in UTC; store business IANA timezone; compute/display local times with daylight-saving tests.
- Two clients racing for a slot must not both confirm. Use database-backed atomic conflict protection plus server validation, not frontend-only checks.
- Use explicit statuses: `pending`, `confirmed`, `completed`, `cancelled`, `no_show`, and optionally `expired`; document permitted state transitions.
- Idempotency keys prevent duplicate booking from retries/webhooks.
- Price is derived from trusted server configuration; AI cannot invent slots/prices or bypass policies.
- Support partial failures: booked but email failed → keep booking and retry notification, never silently create a second booking.

## 7. AI receptionist specification

**Inputs:** verified tenant context, approved business facts/services/staff, availability queries, current conversation, authorized customer identity, channel metadata. **Outputs:** concise customer responses; structured tool calls; confidence/uncertainty flags; audit events.

**Initial tools:** `get_business_details`, `get_services`, `get_staff`, `get_opening_hours`, `check_availability`, `get_booking_policy`, `create_booking`, `find_verified_customer_booking`, `reschedule_booking`, `cancel_booking`, `transfer_to_human`, `queue_confirmation`.

**Safety:** tools are narrow server endpoints; allowlisted parameters; input validation; per-tenant scoping; explicit confirmation before writes; verified identity for modifications; rate/cost limits; PII minimization; no direct unrestricted model access to DB; no secrets in prompts. Log structured tool outcomes without unnecessary transcript exposure.

**FYP evaluation:** manually labeled intent examples and realistic test conversations; booking tool-call correctness; task success, false confirmations, time-to-complete, safe escalation, simultaneous booking races, cancellation authorization and multilingual/timezone cases. Report actual measured numbers with sample sizes, not claimed accuracy.

## 8. Channel integrations and practical requirements

| Channel/service | Required account/configuration | Build stage | Verification |
|---|---|---|---|
| Internal calendar | Business schedules + PostgreSQL engine | Phase 1 | Real conflict tests |
| Email | Resend/equivalent, verified domain, API key, jobs | Phase 1 | Deliverability and retries |
| Website AI | AI model account/key stored server side, budget limits | Phase 2 | Tool-call/evaluation suite |
| WhatsApp text | Official Meta/business provider, number onboarding, webhook, templates/policy | Phase 3 | Sandbox, then authorized live messaging |
| Normal phone | Twilio/other telephony eligibility, number/forwarding, realtime gateway, voice model | Phase 4 | Recorded consent where required, test calls, escalation |
| WhatsApp calls | Provider-supported Calling API, account/region eligibility | Conditional | Capability proof before commitment |
| External calendar | Google Cloud OAuth + Calendar scopes, token storage, sync rules | Phase 5 optional | Two-way conflict and retry testing |
| SaaS billing | Merchant account approval, checkout, verified webhooks | Phase 5 | Sandbox and subscription state machine |
| Customer deposits | Salon-owned payment rails per supported jurisdiction | Later | Separate funds and legal evaluation |

**Credential handling:** owner creates provider accounts and grants least-privilege access; secrets are stored in environment secrets manager, never pasted into AI chats, repositories or screenshots. Sandbox first. Check provider policies, region support and prices again at implementation time.

## 9. Recommended stack and working arrangement

- **Planning/product/spec:** ChatGPT + project owner; final decisions logged here.
- **Coding:** Cursor as primary IDE; Antigravity for scoped implementation/browser QA; avoid concurrent edits to same branch/files.
- **Web:** Next.js App Router, React, TypeScript, Tailwind CSS and accessible components.
- **Server:** Next.js server/API routes for regular CRUD; separate durable queue/worker and persistent voice gateway where required.
- **Data:** Supabase PostgreSQL, tracked SQL migrations, robust access control/RLS; object storage only as needed.
- **AI:** OpenAI or approved equivalent via server-side adapter and function/tool calling.
- **Ops:** GitHub repository, CI, staging, Vercel production frontend, monitoring, backups, documented rollback.
- **Messaging:** Resend/equivalent; authorized WhatsApp Business platform; approved phone/SIP provider.
- **Billing:** Approved merchant-of-record/subscription provider pending merchant eligibility; do not assume Stripe Pakistan support.

**Environments:** local development with synthetic customers; isolated staging accounts and provider sandboxes; separate production project/secrets/database. Never reuse production tokens in development.

## 10. Minimum proposed data model

`users`, `businesses`, `memberships`, `locations`, `services`, `staff`, `staff_services`, `working_hours`, `time_off`, `resources` (when needed), `customers`, `appointments`, `appointment_events`, `booking_idempotency`, `conversations`, `agent_tool_events`, `notifications`, `integration_connections`, `subscription_accounts`, `subscription_events`, `audit_logs`.

All business-owned tables include scoped business/location identifiers. Define foreign keys, unique indexes, date/time constraints, retention/deletion rules and an authorization matrix before migrations. Avoid storing card details; store only permitted payment-provider identifiers.

## 11. Phase-by-phase execution and verification

### Phase 0 — Discovery, design and foundation decisions
**Goal:** implementation-ready specification, no speculative coding. **Owner provides:** FYP deadline/team size, first market, MVP language/currency, draft business policies and accounts when necessary.  
**Antigravity tasks:** inspect repository and `AGENTS.md`; inventory current code; write architecture diagram, ERD, role/permission matrix, all user stories; identify provider blockers; define threat model; write acceptance tests; organize milestone backlog.  
**Deliverables:** `docs/architecture.md`, `docs/data-model.md`, `docs/permissions.md`, `docs/backlog.md`, `docs/test-plan.md`, ADR/decision log and initial working README.  
**Gate to Phase 1:** architecture reviewed; P0 scope frozen; booking states/permissions defined; risks and unverified API dependencies explicitly recorded.  
**Evidence:** repository commit, reviewed design docs and signed checklist.

### Phase 1 — Core booking SaaS (first usable product)
**Goal:** a salon can create an account and accept accurate customer bookings without AI.  
**Build order:** (1) Next.js/repo/CI/local env, (2) Supabase/auth/tenants/RLS, (3) onboarding and settings, (4) staff/services/shifts/time off, (5) availability calculation and transaction-safe booking API, (6) mobile public booking UI, (7) dashboard/calendar/manual booking, (8) notifications/reminders with retry logs, (9) basic reports and error monitoring.  
**Acceptance checklist:**
- [ ] Owner can create one salon workspace; unauthorized users cannot read other salons.
- [ ] Staff/service changes immediately affect new slot calculations.
- [ ] Booking works across DST, timezones, buffers, holidays and staff leave.
- [ ] Concurrent race for same slot yields **at most one** confirmed booking.
- [ ] Duplicate request retries do not create duplicate appointments.
- [ ] Cancellation/rescheduling obeys policy; confirmation email and retry state are observable.
- [ ] Mobile booking flow completes on small screens and keyboard navigation works.
- [ ] Unit, integration, E2E, security tests and production build pass.
**Gate to Phase 2:** reliable non-AI booking demo for at least 2 synthetic businesses and no known tenant crossover / double-book bug.

### Phase 2 — Tool-using AI website receptionist (FYP innovation)
**Goal:** conversational booking with genuine backend tools and measurable accuracy.  
**Build order:** (1) server-side AI provider adapter, (2) conversation/session model, (3) read-only service/staff/policy/availability tools, (4) structured intent extraction and clarification, (5) confirmation + authorized write tools, (6) safe cancellation/reschedule, (7) handoff, fallback and transcript controls, (8) labeled evaluation dataset and automated tests.  
**Acceptance checklist:**
- [ ] AI only offers backend-returned real slots and prices.
- [ ] No booking writes before customer confirmation.
- [ ] AI never modifies unverified customer's booking.
- [ ] API errors and no availability produce clear fallback/handoff.
- [ ] AI tools are tenant-scoped, rate-limited and audited.
- [ ] Test results quantify booking success, hallucination/false-confirmation rate and unsafe tool attempts.
**Gate to Phase 3:** end-to-end website chat → confirmed booking works in staging; tests and demo evidence recorded.

### Phase 3 — WhatsApp messaging and reliable notifications
**Goal:** authorized text-based booking on an official WhatsApp channel.  
**Build order:** (1) verify provider and account eligibility, (2) connect test business number, (3) validate webhook signatures, (4) map messages to tenant + conversation, (5) reuse Phase 2 AI/booking tools, (6) outbound confirmation/reminder templates with consent, (7) deduplication and retries, (8) channel quotas and error dashboard.  
**Acceptance checklist:**
- [ ] Unauthorized webhook is rejected and duplicates are handled once.
- [ ] Incoming WhatsApp text identifies correct business, with privacy isolation.
- [ ] Booking results match website calendar and cannot overlap.
- [ ] Template/opt-in rules and costs are documented and tested.
- [ ] Provider sandbox tests are labeled separately from live tests.
**Gate to Phase 4:** successful controlled WhatsApp sandbox flow, policy checks, reliable fallback.

### Phase 4 — Regular telephone AI voice pilot
**Goal:** prove inbound live voice appointment booking through an approved phone/SIP provider.  
**Build order:** (1) confirm telephony availability and call routing, (2) provision number/forwarding, (3) deploy persistent realtime media gateway, (4) stream audio to voice AI, (5) invoke same booking tools, (6) consent notice and human transfer, (7) interruption/low-confidence handling, (8) call logs and minute/token metering, (9) load/reliability/cost testing.  
**Acceptance checklist:**
- [ ] Real provider test call reaches the agent and handles silence/interruption.
- [ ] Agent can list verified openings and confirm booking only after authorized action.
- [ ] Human transfer and provider outage fallback work.
- [ ] Consent, retention, region/cost and privacy controls verified.
- [ ] Voice gateway restart/reconnect and timeouts are tested.
**Gate to Phase 5:** successful monitored pilot calls and documented cost per call; no misleading claim about WhatsApp calling support.

### Phase 5 — Commercial readiness and expansion
**Goal:** safely onboard paid independent salons and operate SaaS continuously.  
**Build order:** (1) approved merchant onboarding, (2) hosted subscription checkout and signed/idempotent webhooks, (3) trial, plan limits, metering, cancellation, failed-payment behavior, (4) backup/restore and incidents, (5) optional Calendar sync, (6) optional client-owned deposits, (7) onboarding guides/helpdesk, (8) beta businesses and feedback loops, (9) pricing/acquisition experiments and operations dashboard.  
**Acceptance checklist:**
- [ ] Subscription state changes come from verified provider events, not redirect URLs.
- [ ] Unpaid/trial limits are enforceable; downgrade preserves customer data safely.
- [ ] Data deletion/export, privacy disclosures and access requests have documented process.
- [ ] Production access, monitoring, backups and restore drill verified.
- [ ] At least a few real pilot salons complete key booking workflow and issues are documented.
- [ ] No unsupported promises about profitability, merchant eligibility or compliance.
**Release gate:** explicit owner sign-off after billing/security/operations review.

### Conditional expansion — only after verified demand
Nail salons, spas, tutors, trainers, consultants, car detailing, resource booking, memberships, multi-location, branded/custom domains; WhatsApp *calling* only after verified provider eligibility. For each industry, conduct workflow validation and add distinct configurations rather than copied landing pages.

## 12. Verification playbook — run at every phase

**Required report after each delivery:** objective; scope; changed files; migration names; providers configured and their environment; test commands/results; screenshots/log evidence; tenant and booking security check; outstanding issues; blocker ownership; recommendation for go/no-go.

**Status labels:** `Not started`, `In progress`, `Implemented (untested)`, `Mock tested`, `Sandbox verified`, `Production verified`, `Blocked`, `Approved`.

**Mandatory test scenarios:**
1. Two salons with overlapping identifiers remain isolated.
2. Two concurrent booking requests for identical staff/time: one succeeds, one conflict.
3. Booking from UK timezone across daylight saving change.
4. Staff break, holiday, service buffer and staff-specific pricing/duration.
5. Customer cancels within/outside allowed cancellation window.
6. Email fails after successful booking; retry without duplicate booking.
7. AI requests unavailable slot; never fabricates availability.
8. AI asked to cancel another user's booking; rejects or verifies properly.
9. Provider webhook replay and invalid signature rejected.
10. Voice dropped mid-call; no false booking confirmation.
11. Small-screen 320–390px booking flow, keyboard and screen-reader basics.
12. SaaS billing webhook replay, delayed renewal, cancellation and failure (Phase 5).

**Definition of done:** documented feature acceptance; automated tests; no critical security bugs; code review; migration/rollback notes; staging E2E; explicit QA report. Mock success is not a verified live integration.

## 13. Business validation and commercialization plan

**Before spending heavily on Ads:** interview 10–15 owners in one narrowly defined market, record current booking methods, call volume, costs of missed bookings, current software and pricing reactions. Show prototype and request trial/paid pilot commitments rather than treating compliments as demand.

**Acquisition:** niche-specific landing page and live demo; small controlled Facebook/Instagram and Google Ads tests; targeted direct outreach/partnerships; onboarding assistance; usage and cancellation feedback. SEO pages must each offer unique intent/usefulness.

**Illustrative pricing only:** Starter ~$19, AI chat ~$49, voice tier ~$99+ with clear usage limits; actual plan must depend on AI inference cost, message/call fees, competitor comparison and willingness to pay. Track CAC, activation, booked appointments, retention, churn, gross margin, payback period; never equate revenue with profit.

**SaaS fulfillment:** one deployed application → tenant account/workspace → owner adds staff/services → unique booking URL → subscription billing, centrally maintained updates. No need to install separate copies for each salon. Enterprise dedicated hosting and custom domains are later options.

## 14. Risks, decisions awaiting owner approval and change control

| Risk/open question | Required decision/evidence | Default until then |
|---|---|---|
| FYP submission constraints | Deadline, group size, grading rubric | Use 16-week outline as provisional only |
| First commercial market | UK vs other country, customer interviews | No geo-specific launch claims |
| Pricing / brand / domain | Research, domain check, customer tests | Placeholder brand/prices |
| WhatsApp accounts and costs | Official eligibility, business verification, approved provider | Sandbox only |
| Voice provider coverage/cost | Country/number legality, routing, telephony trial | Phase 4 only |
| Payment provider eligibility | Merchant onboarding and payouts verified | Do not collect real money |
| Customer deposits | Salon-owned provider, data/contract review | Pay-at-salon |
| Privacy/legal | Applicable jurisdiction, consent, recordings and retention | Minimal data; no live recording by default |
| Scope creep | Product owner review of every P2/P3 feature | Protect P0/P1 deadlines |

**Change-control process:** proposed change → why/value → impacted screens/APIs/data/cost/compliance → risk estimate → owner approval → feature branch → migrations + tests → QA evidence → merge/release. Keep a dated decision log; never silently amend baseline scope.

## 15. Working templates

### Phase progress record (duplicate for each phase)
- Phase / owner / date:
- Status:
- Agreed scope and acceptance criteria:
- Files/modules delivered:
- Integrations (mock/sandbox/live):
- Tests and exact results:
- Bugs and security review:
- Demonstration/screenshots:
- Costs/usage observed:
- Go/no-go decision and approver:
- Next phase dependencies:

### Implementation prompt for Antigravity
> Read `AGENTS.md` and `BOOKPILOT_PROJECT_MASTER_PLAN.md`. Inspect the real repository before making changes. Work only on Phase [N] and its acceptance criteria. First deliver TASK UNDERSTANDING, files to inspect, architecture effects, blockers and a verification plan. Implement in small reviewable changes with migrations/tests. Never touch live billing, production user data, external messaging or production deployment without explicit owner approval. Finish with IMPLEMENTATION REPORT, actual test output, provider-test status, changed files and remaining blockers. Do not declare an integration complete if it was only mocked.

### Initial tasks for the next session
1. Place this document beside `AGENTS.md` in the project root or `docs/` and reference it in README.
2. Ask Antigravity to perform **Phase 0 only**, audit repository and produce proposed architecture/ERD/backlog.
3. Review and approve Phase 0 before generating Phase 1 implementation prompts.
4. Keep the progress record updated after every Antigravity implementation report.

---
**Document policy:** This document is a decision and delivery baseline, not proof that any code, integration, provider eligibility, customer demand or revenue has been verified. If it differs from `AGENTS.md` on security or agent behavior, the stricter `AGENTS.md` rule takes precedence; raise a change request to reconcile the documents.
