# BookPilot AI — User Roles, Permissions & Security Matrix

> **Document Version:** 1.0  
> **Phase:** Phase 0 (Discovery & Specification)  
> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) Section 3, 5, 12 & [BOOKPILOT_PROJECT_MASTER_PLAN.md](file:///c:/laragon/www/Ai%20Salon%20software/BOOKPILOT_PROJECT_MASTER_PLAN.md) Section 3

---

## 1. Role Definitions

| Role Identifier | Title | Context Scope | Description |
|---|---|---|---|
| `platform_admin` | Platform Administrator | Global System | Internal operator managing system health, platform metrics, and tenant subscriptions. Access is strictly audited. |
| `business_owner` | Salon / Business Owner | Single Tenant (`organization_id`) | Full administrative authority over their salon organization, locations, staff, services, pricing, operating hours, billing, and AI settings. |
| `manager_receptionist` | Manager / Receptionist | Single Tenant (`organization_id`) | Manages day-to-day operations: creating, rescheduling, and cancelling appointments, viewing customer history, and overriding staff shifts. No access to SaaS billing or owner account deletion. |
| `staff_member` | Staff Member (Barber / Stylist) | Single Tenant (`organization_id`) | Individual service provider. Authorized to view their personal schedule, assigned appointments, and manage own breaks/working hours if permitted. |
| `customer` | Customer / Client | Public / Verified Guest Scope | Public booking client. Can browse services and availability, book appointments, and modify/cancel *only* their verified appointments via cryptographic token. |
| `ai_agent` | AI Receptionist Service | Scoped Tenant Context | Server-side conversational agent executing strictly whitelisted tool endpoints. Cannot execute arbitrary queries or bypass booking rules. |

---

## 2. Granular Permissions Matrix

| Domain Action | Platform Admin | Business Owner | Manager / Receptionist | Staff Member | Customer (Public/Guest) | AI Receptionist Agent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Tenant & Organization Management** | | | | | | |
| View organization details | ✅ (Audited) | ✅ | ✅ | ✅ | ❌ (Public profile only) | ✅ (Whitelisted info) |
| Update organization settings / branding | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage SaaS billing & subscription | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete organization workspace | ❌ (Requires root sign-off) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Locations & Operating Hours** | | | | | | |
| Create / delete physical locations | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit opening hours & policies | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View opening hours & locations | ✅ | ✅ | ✅ | ✅ | ✅ (Public API) | ✅ (Via tool) |
| **Services & Resources** | | | | | | |
| Create, edit, delete services | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure pricing & durations | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View services & prices | ✅ | ✅ | ✅ | ✅ | ✅ (Public API) | ✅ (Via tool) |
| **Staff & Schedules** | | | | | | |
| Invite / remove staff members | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage staff shifts & working days | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Request / approve staff time-off | ❌ | ✅ | ✅ | ✅ (Own request) | ❌ | ❌ |
| View staff availability & roster | ✅ | ✅ | ✅ | ✅ (Own + team) | ✅ (Aggregated slots) | ✅ (Via tool) |
| **Appointments & Bookings** | | | | | | |
| Public booking creation | ❌ | ❌ | ❌ | ❌ | ✅ (Via slot engine) | ✅ (Requires confirmation) |
| Manual in-dashboard booking creation | ❌ | ✅ | ✅ | ✅ (For self) | ❌ | ❌ |
| View calendar / appointment roster | ✅ (Audited) | ✅ (Full org) | ✅ (Full org) | ✅ (Assigned only) | ❌ | ❌ |
| View appointment details | ✅ (Audited) | ✅ | ✅ | ✅ (Assigned only) | ✅ (Own booking token) | ✅ (Verified identity) |
| Reschedule appointment | ❌ | ✅ | ✅ | ✅ (Assigned) | ✅ (Tokenized within policy) | ✅ (Verified + confirmed) |
| Cancel appointment | ❌ | ✅ | ✅ | ✅ (Assigned) | ✅ (Tokenized within policy) | ✅ (Verified + confirmed) |
| Mark as No-Show / Completed | ❌ | ✅ | ✅ | ✅ (Assigned) | ❌ | ❌ |
| **Customers & Consent** | | | | | | |
| View customer list & appointment history | ✅ (Audited) | ✅ | ✅ | ❌ (Limited glance) | ❌ | ❌ |
| Update customer notes & records | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export / delete customer PII (GDPR) | ❌ | ✅ | ❌ | ❌ | ✅ (Via DSR request) | ❌ |
| **AI Receptionist & Logs** | | | | | | |
| View AI conversation transcripts | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View AI tool execution audit log | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure AI tone, prompt & instructions | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trigger human escalation | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Via tool) |

---

## 3. Defense-in-Depth Authorization Architecture

To ensure strict tenant isolation and eliminate data leak vulnerabilities, BookPilot AI enforces security at three distinct architectural layers:

```
[Layer 1: Edge & Route Middleware]  --> Verifies JWT, extracts User ID & checks active session
                  ↓
[Layer 2: Domain Service Layer]     --> Queries organization_memberships, enforces role permissions, validates parameters
                  ↓
[Layer 3: PostgreSQL Database RLS]  --> Database-level Row Level Security guarantees zero cross-tenant leakage
```

### Layer 1: Edge & Route Middleware
- Intercepts all incoming requests to `/dashboard/*` and `/api/*`.
- Validates the Supabase Auth session token.
- Rejects unauthenticated requests with `401 Unauthorized`.

### Layer 2: Domain Service Authorization
- Every server action and route handler resolves the caller's verified `user_id`.
- The domain service queries `organization_memberships` for `(organization_id, user_id)`.
- If no active membership exists or the role has insufficient privileges, execution halts immediately with `403 Forbidden`.
- **Tenant Scope Enforcement**: Every database query is parameterized with `WHERE organization_id = $organizationId`. Never look up a record by primary key alone.

### Layer 3: Database Row Level Security (RLS)
PostgreSQL RLS is enabled on all tenant-owned tables. When client SDKs are utilized, policies enforce tenant boundaries:

```sql
-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Owner and Manager policy
CREATE POLICY org_members_manage_appointments ON appointments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_memberships m
            WHERE m.organization_id = appointments.organization_id
              AND m.user_id = auth.uid()
              AND m.role IN ('business_owner', 'manager_receptionist')
              AND m.is_active = TRUE
        )
    );

-- Staff policy (can only see appointments assigned to them)
CREATE POLICY staff_view_assigned_appointments ON appointments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.id = appointments.staff_id
              AND s.user_id = auth.uid()
              AND s.organization_id = appointments.organization_id
        )
    );
```

---

## 4. Tokenized Guest Authorization (Public & Customer Security)

Customers booking online or interacting with the AI receptionist do not have traditional login passwords. To prevent unauthorized access or ID-guessing attacks:

1. **No Guessable Sequential IDs**: All entity IDs are random UUIDv4 identifiers.
2. **Short Booking References**: The human-readable code (e.g. `BP-78421`) is used **only** for display and reception identification; it is **never** accepted alone to authorize an appointment change or cancellation.
3. **Signed Management Tokens**:
   - When an appointment is confirmed, an HMAC-SHA256 token is generated:
     ```ts
     const payload = `${appointmentId}:${customerId}:${expiresAt}`;
     const signature = createHmac('sha256', process.env.BOOKING_TOKEN_SECRET)
       .update(payload)
       .digest('hex');
     const managementToken = `${payload}.${signature}`;
     ```
   - Management links in confirmation emails:  
     `https://bookpilot.app/booking/the-barber-club/manage?token=<managementToken>`
   - Any reschedule or cancellation request must present this verified, unexpired token.
4. **AI Receptionist Customer Verification**:
   - When a customer asks the AI receptionist to view or modify an existing booking, the AI **must** verify identity through two pieces of matching context (e.g. Booking Reference + Customer Phone Number or Email).
   - The server tool evaluates the match and returns a scoped, temporary `verificationToken` before accepting any cancellation or rescheduling action.

---

## 5. Security Checklist & Prohibited Actions

- ❌ **NO Hardcoded Credentials**: API secrets, database passwords, and provider keys must reside solely in environment variables.
- ❌ **NO Cross-Tenant Data Access**: Never query `SELECT * FROM appointments WHERE id = $id`. Always query `WHERE id = $id AND organization_id = $orgId`.
- ❌ **NO Unchecked LLM Actions**: The AI receptionist must never directly execute SQL or mutate database state without structured tool validation and explicit user confirmation.
- ❌ **NO Raw Transcripts with PII**: Credit cards, passwords, or excessive customer data must not be logged in server traces or plain-text AI audits.
