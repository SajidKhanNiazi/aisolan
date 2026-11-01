# Bookzello — Phase 1H: WhatsApp Pilot Setup & Verification Guide

> **Document Version:** 1.0  
> **Date:** October 31, 2026  
> **Status:** Seed Executed Manually in Production; Block C Verification Ready  
> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) Section 1, 6, 8, 12, 13

---

## 1. Overview & Pilot Topology

- **Production Project:** `nrgfwshzbsgbuvqisaak` (Supabase PostgreSQL 15+)
- **Production URL:** `https://bookzello.com`
- **Pilot Tenant:** `bookpilot-qa-salon`
- **Meta WABA ID:** `1796731811545454`
- **Meta Test Phone Number ID:** `1314214205118465`
- **Meta Display Number:** `+15552134504`
- **Migration:** `supabase/migrations/20261031000015_create_whatsapp_integration.sql` (Applied)

---

## 2. SQL Seed Execution Record

On **October 31, 2026**, the business owner executed the corrected **Block B — WhatsApp Pilot Connection Seed** directly via the Supabase Production SQL Editor.

- **Supabase Response:** `Success. No rows returned`
- **Tracked SQL Reference:** [`docs/sql/2026-10-31-whatsapp-pilot-connection-seed.sql`](file:///c:/laragon/www/Ai%20Salon%20software/docs/sql/2026-10-31-whatsapp-pilot-connection-seed.sql)
- **Execution Mechanism:** Manual execution in SQL Editor. This script is **NOT** included in `supabase/migrations/` to prevent automated re-execution during CI/CD migrations.

### Key Seed Protections:
1. `SELECT id INTO STRICT v_business_id`: Requires exactly one matching pilot business (`bookpilot-qa-salon`).
2. `gen_random_uuid()`: Generates a genuine UUID for `public.whatsapp_connections.id`.
3. `ON CONFLICT (phone_number_id) DO NOTHING`: Ensures existing tenant connection ownership is immutable.
4. Post-insert validation asserts matching `business_id`, `waba_id`, `provider = 'meta_cloud_api'`, `connection_status = 'active'`, `ai_enabled = true`, `booking_enabled = false`, and `credential_reference IS NULL`.

---

## 3. Block C: Read-Only Verification Query

To verify the state in Supabase Production SQL Editor:

```sql
-- Block C: Read-Only Inspection
SELECT
    wc.id AS connection_id,
    wc.business_id,
    b.slug AS business_slug,
    b.name AS business_name,
    wc.provider,
    wc.waba_id,
    wc.phone_number_id,
    wc.business_display_number,
    wc.connection_status,
    wc.ai_enabled,
    wc.booking_enabled,
    wc.credential_reference,
    wc.disconnected_at,
    wc.created_at,
    wc.updated_at
FROM public.whatsapp_connections wc
JOIN public.businesses b ON b.id = wc.business_id
WHERE wc.phone_number_id = '1314214205118465';

-- Tenant Isolation & Integrity Check
SELECT
    COUNT(*) AS total_connections,
    COUNT(CASE WHEN phone_number_id = '1314214205118465' THEN 1 END) AS pilot_connections,
    COUNT(CASE WHEN phone_number_id != '1314214205118465' THEN 1 END) AS other_connections
FROM public.whatsapp_connections;
```

### Verified Production Record (Confirmed via Block C Execution):
- **Connection UUID:** `1dc11805-a04d-4c65-a657-5e255849bafb`
- **Business Slug:** `bookpilot-qa-salon`
- **Provider:** `meta_cloud_api`
- **WABA ID:** `1796731811545454`
- **Phone Number ID:** `1314214205118465`
- **Connection Status:** `active`
- **AI Enabled:** `true`
- **Booking Enabled:** `false`
- **Credential Reference:** `NULL`
- **Other Connections Count:** `0`

---

## 4. Block D: Non-Destructive Deactivation (Emergency Rollback)

If the pilot connection needs to be deactivated at any time, execute:

```sql
-- Block D: Safe, Non-Destructive Deactivation
UPDATE public.whatsapp_connections
SET
    connection_status = 'disconnected',
    disconnected_at = NOW(),
    updated_at = NOW()
WHERE phone_number_id = '1314214205118465'
  AND connection_status = 'active';
```

*Note: Never execute `DELETE FROM public.whatsapp_connections`, as foreign keys cascade deletion to audit trails and conversation records.*

---

## 5. Production Safety Guardrails

All three activation flags must remain `false` until authorized:
```env
WHATSAPP_ENABLED=false
WHATSAPP_OUTBOUND_ENABLED=false
WHATSAPP_BOOKING_WRITES_ENABLED=false
```
