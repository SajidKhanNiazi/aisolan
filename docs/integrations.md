# BookPilot AI — External Integrations & Provider Specifications

> **Document Version:** 1.0  
> **Phase:** Phase 0 (Discovery & Specification)  
> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) Section 1, 3, 8 & [BOOKPILOT_PROJECT_MASTER_PLAN.md](file:///c:/laragon/www/Ai%20Salon%20software/BOOKPILOT_PROJECT_MASTER_PLAN.md) Section 8, 14

---

## 1. Integration Status & Verification Lifecycle

In strict adherence to `AGENTS.md` Section 1:
> *"Never claim an integration works unless it has been tested with its actual provider or clearly identified sandbox/mock. Distinguish **implemented**, **tested with mocks**, **verified in sandbox**, and **verified in production**."*

### Standard Status Categories
- `Not started`: Specification stage only; no code written.
- `Implemented (untested)`: Adapter code in place, but not yet tested against mocks or API endpoints.
- `Tested with mocks`: Validated against localized unit test mocks or synthetic HTTP fixtures.
- `Verified in sandbox`: Tested with active provider developer sandbox credentials and verified webhooks.
- `Verified in production`: End-to-end verified with live merchant/customer accounts.

---

## 2. Comprehensive Provider Integration Matrix

| Integration Domain | Primary Provider | Target Phase | Current Status | Required Configuration / Credentials | Verification Threshold |
|---|---|:---:|:---:|---|---|
| **Database & Auth** | Supabase (PostgreSQL 15+) | **Phase 1** | `Not started` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Migration scripts pass; RLS tenant boundaries verified. |
| **Transactional Email** | Resend | **Phase 1** | `Not started` | `RESEND_API_KEY`, verified sending domain / DNS records | Successful test email dispatch with delivery status logging. |
| **AI LLM Engine** | OpenAI (or equivalent adapter) | **Phase 2** | `Not started` | `AI_PROVIDER_API_KEY`, `AI_MODEL_NAME` (e.g., `gpt-4o-mini`) | Structured tool call evaluation suite (JSON schemas validated). |
| **WhatsApp Messaging** | Meta WhatsApp Cloud API | **Phase 3** | `Not started` | Meta App ID, System User Token, WABA ID, Webhook Verify Token | Verified webhook signature, two-way messaging in Meta Sandbox. |
| **Telephony / Voice** | SIP / Twilio / LiveKit Gateway | **Phase 4** | `Not started` | SIP Trunk / Telephony SID, Auth Token, Provisioned Phone Number | Live test phone call with spoken consent & booking confirmation. |
| **SaaS Subscription Billing** | Merchant of Record (e.g. Stripe / Lemon Squeezy) | **Phase 5** | `Not started` | Merchant API Keys, Webhook Signing Secret | Idempotent webhook handling across subscription states (trial → active → canceled). |
| **External Calendar Sync** | Google Calendar API | **Phase 5 (Optional)** | `Not started` | Google Cloud Console OAuth 2.0 Client ID, Secret, Scopes | Two-way conflict resolution without duplicate calendar events. |

---

## 3. Deep-Dive Provider Specifications

### 3.1 Supabase (Database & Authentication)
- **Role**: Primary relational data store, migration execution, and user session authentication.
- **Security Requirements**:
  - `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed in client-side bundles or repository commits.
  - Server actions and API routes use server-side client with cookie-based session management (`@supabase/ssr`).
  - Row Level Security (RLS) is active on every table to guarantee multi-tenant isolation.
- **Failure Mode & Fallback**: Connection pooling via Supabase PgBouncer / transaction pooler (`PORT 6543`) to prevent connection exhaustion during traffic spikes.

### 3.2 Resend (Transactional Email)
- **Role**: Dispatches instant booking confirmations, 24-hour appointment reminders, and cancellation receipts.
- **Resilience Architecture**:
  - Email sending is asynchronous: the booking database transaction commits first.
  - An entry is inserted into the `notifications` table with status `queued`.
  - A background handler attempts delivery. If Resend returns an error (rate limit or network blip), the attempt is recorded in `notification_attempts`, and retried up to 3 times with exponential backoff.
  - A failed email **never** cancels or rolls back a confirmed booking.

### 3.3 AI Model Provider Adapter
- **Role**: Natural language understanding, intent extraction, and function/tool calling for the AI receptionist.
- **Provider-Agnostic Interface**:
  ```ts
  interface AIProviderAdapter {
    chatCompletion(messages: AIMessage[], tools: AIToolDefinition[]): Promise<AIChatResponse>;
  }
  ```
- **Safety Constraints**:
  - All tools must use strict JSON Schema parameters enforced via Zod.
  - Temperature set to `0.1` to ensure deterministic tool selection.
  - Rate limiting enforced per tenant (`max_tokens_per_minute`, `max_daily_conversations`) to prevent bill shock.
  - System prompts strictly instructed never to fabricate availability or confirm bookings without invoking server tools.

### 3.4 WhatsApp Business Cloud API (Phase 3)
- **Role**: Official text-based booking channel for clients messaging the salon's business number.
- **Onboarding Prerequisites**:
  1. Verified Meta Business Manager account.
  2. WhatsApp Business Account (WABA) with approved display name.
  3. Pre-approved WhatsApp HSM message templates for proactive notifications (reminders).
- **Security & Webhooks**:
  - Meta webhook signatures verified via HMAC-SHA256 with `APP_SECRET`.
  - Inbound messages mapped to `organizations` via the recipient phone number.
  - Deduplication cache (`wamid`) prevents duplicate processing of retried webhook deliveries.

### 3.5 Telephony & Voice Gateway (Phase 4)
- **Role**: Realtime voice AI receptionist for inbound phone calls.
- **Architectural Boundary**:
  - **Not a serverless function**: Live audio streaming requires a stateful persistent WebSocket gateway (Node.js / Go container) to maintain audio bi-directional streams.
  - Must play an automated consent notice ("This call is processed by an automated AI assistant") compliant with regional recording laws.
  - Caller voice dropped or disconnected: transaction automatically aborts; no partial booking without confirmed completion.

### 3.6 SaaS Billing & Funds Separation (Phase 5)
- **Critical Distinction** (Per `AGENTS.md` Section 9):
  - **SaaS Subscription Billing**: The monthly fee paid by the salon owner to BookPilot AI (e.g. £29/month).
  - **Salon Customer Deposits**: Booking deposits paid by salon clients to the salon owner. These must use separate salon-owned payment merchant rails and are **NOT** part of the initial MVP.
- **Merchant Eligibility**: Do not assume Stripe support in unverified jurisdictions. Test in sandbox first.

---

## 4. Environment Variables Specification

```bash
# ==========================================
# Application Configuration
# ==========================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ==========================================
# Supabase (Database & Auth)
# ==========================================
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..." # Server only! Never expose to client.
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres"

# ==========================================
# Security & Token Signing
# ==========================================
BOOKING_TOKEN_SECRET="super-secret-random-hex-string-for-hmac-sha256"

# ==========================================
# Email Provider (Resend)
# ==========================================
RESEND_API_KEY="re_123456789..."
EMAIL_FROM_ADDRESS="appointments@bookpilot.app"

# ==========================================
# AI Receptionist Provider (OpenAI / Adapter)
# ==========================================
AI_PROVIDER_API_KEY="sk-proj-..."
AI_MODEL_NAME="gpt-4o-mini"

# ==========================================
# WhatsApp Business (Phase 3 - Placeholder)
# ==========================================
WHATSAPP_API_TOKEN=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""

# ==========================================
# SaaS Billing (Phase 5 - Placeholder)
# ==========================================
BILLING_PROVIDER_API_KEY=""
BILLING_WEBHOOK_SECRET=""
```
