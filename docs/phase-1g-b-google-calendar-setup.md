# BookPilot AI — Phase 1G-B: Google Calendar Integration Setup Guide

> **Target Audience:** Salon SaaS Platform Owner & DevOps  
> **Status:** Phase 1G-B Local Implementation Complete (OAuth Credentials & Production Deployment Deferred)  
> **Security Notice:** Never post OAuth Client Secrets, Refresh Tokens, or Encryption Keys into public repositories, chat transcripts, or client-side bundles.

---

## 1. Overview & Architecture

BookPilot AI Phase 1G-B implements a **secure, multi-tenant one-way synchronization engine** from BookPilot AI to Google Calendar:

```
[Customer / Owner Booking Action]
            │
            ▼ (Atomic PostgreSQL Commit)
[appointments table] ──► [Database Trigger] ──► [calendar_sync_outbox]
                                                         │
                                                         ▼ (Atomic Claim: FOR UPDATE SKIP LOCKED)
                                               [Calendar Sync Worker]
                                                         │
                                  ┌──────────────────────┴──────────────────────┐
                                  ▼                                             ▼
                     [Decrypted Refresh Token]                    [Google Calendar REST API v3]
                                  │                                             │
                                  └────────► [events.insert / patch / delete] ──┘
                                                         │
                                                         ▼
                                          [appointment_calendar_events]
```

### Key Architectural Invariants
- **BookPilot Supabase is Authoritative:** Availability calculations and booking rules always originate in the BookPilot database. Google Calendar is an external synchronized view.
- **Fail-Safe Booking Execution:** Google Calendar API outages, token expirations, or network timeouts never abort or block appointment creation, rescheduling, or cancellation.
- **Multi-Tenant Token Isolation:** Refresh tokens are encrypted at rest using AES-256-GCM. Column-level permissions in PostgreSQL strictly revoke token access from tenant users (`authenticated`).
- **Idempotency & Race Prevention:** Outbox queue jobs are keyed with deterministic deduplication keys (`business_id:appointment_id:action:version`). Repeated or concurrent triggers never create duplicate Google events.
- **Zero Heavy Dependencies:** Implemented using standard Node 18+ web standards (`fetch`, `crypto`) with zero heavy SDK bloat, ensuring maximum performance and Next.js 16 / Turbopack compatibility.

---

## 2. Step-by-Step Google Cloud Project & OAuth Setup

Follow these exact steps in the Google Cloud Console to establish production-ready OAuth credentials.

### Step 2.1: Create or Select Google Cloud Project
1. Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the project selector dropdown and click **New Project**.
3. **Project Name:** `BookPilot AI` (or `AiSalon-Booking`).
4. Click **Create** and ensure the new project is active.

### Step 2.2: Enable the Google Calendar API
1. Navigate to **APIs & Services** &rarr; **Library** (or search for `Google Calendar API`).
2. Select **Google Calendar API**.
3. Click **Enable**.

### Step 2.3: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services** &rarr; **OAuth consent screen** (or **Google Auth Platform**).
2. **User Type:** Select **External** and click **Create**.
3. **App Information:**
   - **App name:** `BookPilot AI`
   - **User support email:** Your administrative email address.
   - **App logo:** Optional for testing; required for public release.
4. **App Domain:**
   - **Application home page:** `https://aisolan.vercel.app`
   - **Privacy Policy link:** `https://aisolan.vercel.app` (or your staging policy page)
   - **Terms of Service link:** `https://aisolan.vercel.app`
5. **Developer Contact Information:** Enter your administrative email.
6. Click **Save and Continue**.

### Step 2.4: Configure Scopes
1. On the **Scopes** page, click **Add or Remove Scopes**.
2. Filter or scroll to the following least-privileged scopes required for one-way calendar management:
   - `https://www.googleapis.com/auth/calendar.events` (View and edit events on all calendars)
   - `https://www.googleapis.com/auth/calendar.readonly` (View calendars to populate destination selection dropdown)
3. Click **Update** and then **Save and Continue**.

### Step 2.5: Add Test Users (Crucial for Development & Testing)
> [!IMPORTANT]
> While the app's Publishing Status is **Testing**, only accounts explicitly added to the **Test Users** list can successfully authorize.
1. On the **Test users** step, click **Add Users**.
2. Add the Google Account email addresses of the salon owners or team members who will test the integration.
3. Click **Save and Continue**.

### Step 2.6: Create OAuth 2.0 Web Client Credentials
1. Navigate to **APIs & Services** &rarr; **Credentials**.
2. Click **Create Credentials** &rarr; **OAuth client ID**.
3. **Application type:** Select **Web application**.
4. **Name:** `BookPilot AI Web Client`.
5. **Authorized JavaScript origins:**
   - `https://aisolan.vercel.app`
   - `http://localhost:3000` (for local development)
6. **Authorized redirect URIs:**
   - `https://aisolan.vercel.app/api/integrations/google-calendar/callback`
   - `http://localhost:3000/api/integrations/google-calendar/callback` (for local development)
7. Click **Create**.
8. A modal will display your **Client ID** and **Client Secret**. Keep these secure.

---

## 3. Required Server Environment Variables

Configure the following environment variables in **Vercel Project Settings &rarr; Environment Variables** (and in local `.env.local` for development):

| Variable Name | Required | Example / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Yes | `123456789-abc.apps.googleusercontent.com` | Google OAuth Web Application Client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | `GOCSPX-abcdef1234567890` | Google OAuth Client Secret. Kept strictly server-side. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Yes | `https://aisolan.vercel.app/api/integrations/google-calendar/callback` | Explicit redirect URI matching Google Console configuration. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Yes | 32-byte hex string (e.g. `openssl rand -hex 32`) | Server encryption key for AES-256-GCM token storage. |
| `CRON_SECRET` | Recommended | Any secure random string (e.g. `openssl rand -hex 24`) | Bearer token for authenticating external sync worker triggers. |

> [!CAUTION]
> Never prefix any of these variables with `NEXT_PUBLIC_`. They must remain completely inaccessible to browser bundles.

To generate a secure 32-byte encryption key for `GOOGLE_TOKEN_ENCRYPTION_KEY`:
```bash
# On Linux / macOS / Git Bash:
openssl rand -hex 32

# On Windows PowerShell:
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
```

---

## 4. Supabase Database Migration

Apply migration `0011` to your Supabase PostgreSQL instance:

```bash
# Location in repository:
supabase/migrations/20261023000011_create_google_calendar_sync.sql
```

### What Migration 0011 Creates:
1. `business_calendar_connections`: Stores encrypted OAuth tokens, connected email, selected calendar ID, and sync status.
2. `appointment_calendar_events`: Maintains persistent mapping between BookPilot `appointment_id` and Google `google_event_id`.
3. `calendar_sync_outbox`: Reliable queue for pending calendar operations (create, update, delete).
4. `claim_due_calendar_sync_jobs_atomic()`: High-performance atomic queue claiming using `FOR UPDATE SKIP LOCKED`.
5. `trg_appointments_calendar_sync_outbox`: Non-blocking database trigger queuing sync operations on appointment create, reschedule, or cancel.
6. RLS Policies and Column-Level `REVOKE SELECT (encrypted_refresh_token)` from `authenticated`.

---

## 5. Hostinger / External Cron Worker Setup

Because high-frequency cron jobs on Vercel require a Pro plan, BookPilot AI supports reliable triggering from the owner's **Hostinger Business Hosting** or any external HTTP cron service.

### Setting Up a Hostinger Cron Job:
1. Log in to the **Hostinger hPanel**.
2. Go to **Advanced** &rarr; **Cron Jobs**.
3. Select **Custom** execution.
4. Schedule interval: `* * * * *` (Every 1 minute) or `*/5 * * * *` (Every 5 minutes).
5. **Command:**
   ```bash
   curl -s -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://aisolan.vercel.app/api/integrations/google-calendar/sync" > /dev/null
   ```
6. Click **Save**.

### Vercel Cron Fallback (`vercel.json`):
A fallback daily maintenance trigger is included in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/integrations/google-calendar/sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 6. End-to-End Testing & Verification Flow

Once credentials and migration 0011 are in place, test the full integration lifecycle:

### Test 1: Connect Account
1. Log in to the owner dashboard: `/dashboard/[businessSlug]/settings`.
2. Click the **Google Calendar** tab.
3. Click **Connect Google Calendar**.
4. Log in with an authorized **Test User** Google account and grant calendar permissions.
5. You should be redirected back with a green "Connected" badge and your Google account email displayed.

### Test 2: Destination Calendar Selection
1. Open the **Destination Calendar** dropdown.
2. Select your desired calendar (e.g., "Primary Calendar" or a dedicated "Salon Appointments" calendar).
3. Click **Save Settings**.
4. Verify that write access was confirmed.

### Test 3: New Appointment Sync
1. Book a new appointment via the public booking wizard or the manual dashboard appointment dialog.
2. Trigger the sync worker (or click **Sync Now** in settings).
3. Open Google Calendar in a browser tab.
4. Verify the event appears with:
   - **Title:** `{Service Name} — {Salon Name}`
   - **Start & End Time:** Accurate to the minute in the business timezone.
   - **Description:** Includes booking reference, customer name, and a direct link to the owner dashboard.

### Test 4: Rescheduled Appointment Sync
1. In the owner calendar or via the customer management link, reschedule the appointment to a different time slot or date.
2. Run the sync worker.
3. Verify that the **existing** Google Calendar event is updated to the new time slot (no duplicate event is created).

### Test 5: Cancelled Appointment Sync
1. Cancel the appointment.
2. Run the sync worker.
3. Verify that the event is cleanly deleted from Google Calendar.

### Test 6: Initial Sync of Existing Appointments
1. In the Google Calendar settings tab, click **Sync Next 30 Days**.
2. Verify that upcoming confirmed appointments are queued and synchronized to Google Calendar without duplicate event creation.

### Test 7: Disconnect Flow
1. Click **Disconnect Google Calendar**.
2. Confirm the disconnect modal.
3. Verify that the connection is marked inactive, tokens are wiped, and future sync is halted while existing BookPilot appointments remain completely unaffected.

---

## 7. Future Commercialization: Google Verification Requirements

For the current development and beta testing phases, the app operates in Google's **Testing** mode with explicit test users. **No custom domain purchase is required at this stage.**

When transitioning to a public commercial launch with unlisted public users:
1. **Domain Ownership Verification:** Verify your custom domain in the Google Search Console.
2. **App Branding Review:** Provide official logo, terms of service URL, and privacy policy URL hosted on the verified domain.
3. **Sensitive Scope Review:** Because `https://www.googleapis.com/auth/calendar.events` is classified as a sensitive scope, Google requires:
   - A written justification of why the scope is needed (one-way appointment export for business owners).
   - A short YouTube video demonstrating the OAuth consent screen, calendar selection, and event creation.
   - A comprehensive Privacy Policy detailing data handling and explicitly stating that Google user data is not sold or shared with third parties.

---

## 8. Summary of Deferred External Configurations

The following steps require external console actions by the owner and are safely deferred until approval:
- Creating the Google Cloud OAuth client credentials.
- Setting `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_TOKEN_ENCRYPTION_KEY` in Vercel.
- Applying database migration `20261023000011_create_google_calendar_sync.sql` in Supabase.
- Configuring the Hostinger recurring cron trigger.
