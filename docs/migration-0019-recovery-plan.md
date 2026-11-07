# Migration 0019 — Incident Recovery Plan

> **Scope:** Automated Appointment Reminders & Customer Notes Security  
> **Migration:** `20261106000019_create_automated_appointment_reminders.sql`  
> **Last updated:** 2026-11-07

## ⚠️ Critical Rule

**NEVER disable `trg_customers_enforce_notes_role`** during any incident recovery.  
This trigger protects private customer notes from unauthorized access by staff, anonymous users, and cross-tenant attacks. It is a **security control**, not a feature toggle.

---

## Scenario 1 — Reminder emails sending incorrectly or to wrong recipients

### Immediate actions (within minutes)

1. **Set Vercel environment variable:**
   ```
   ENABLE_OUTBOUND_REMINDERS=false
   ```
   This is the global kill switch. The reminder worker checks this flag before sending any email.

2. **Disable tenant-level reminders (if targeting specific businesses):**
   ```sql
   UPDATE public.business_notification_settings
   SET reminders_enabled = FALSE
   WHERE business_id = '<affected_business_id>';
   ```

3. **Invalidate all pending reminders in the queue:**
   ```sql
   UPDATE public.appointment_reminders
   SET status = 'skipped',
       last_error_message = 'Emergency pause: incident recovery ' || NOW()::TEXT,
       updated_at = NOW()
   WHERE status IN ('pending', 'retry_pending');
   ```

### Investigation

- Check `appointment_reminders` table for `status = 'sent'` rows to identify what was dispatched.
- Check Resend dashboard for actual delivery logs.
- Verify the claim RPC is only being called via the `/api/internal/notifications/process` worker.

### Resolution

- Fix the root cause (template error, wrong recipient logic, timing bug).
- Deploy the fix.
- Re-enable `ENABLE_OUTBOUND_REMINDERS=true` only after verification.
- Re-enable tenant `reminders_enabled` only after business owner confirmation.

---

## Scenario 2 — Reminder trigger creating excessive or incorrect queue rows

### Immediate actions

1. **Disable only the reminder lifecycle trigger:**
   ```sql
   ALTER TABLE public.appointments
   DISABLE TRIGGER trg_appointments_reminder_lifecycle;
   ```
   This stops new reminders from being auto-created on appointment insert/update.
   
   > **Note:** This does NOT affect `trg_customers_enforce_notes_role`. Customer note security remains active.

2. **Invalidate bad queue entries:**
   ```sql
   UPDATE public.appointment_reminders
   SET status = 'skipped',
       last_error_message = 'Trigger malfunction recovery',
       updated_at = NOW()
   WHERE status IN ('pending', 'retry_pending')
     AND created_at > '<incident_start_timestamp>';
   ```

### Resolution

- Fix the trigger function `fn_appointments_reminder_lifecycle_trigger()`.
- Re-enable the trigger:
  ```sql
  ALTER TABLE public.appointments
  ENABLE TRIGGER trg_appointments_reminder_lifecycle;
  ```

---

## Scenario 3 — claim_due_reminders_atomic RPC failure or stuck processing

### Immediate actions

1. **Release stuck leases:**
   ```sql
   UPDATE public.appointment_reminders
   SET status = 'pending',
       claimed_at = NULL,
       lease_expires_at = NULL,
       updated_at = NOW()
   WHERE status = 'processing'
     AND lease_expires_at < NOW();
   ```
   The RPC already handles expired lease recovery automatically, but this forces immediate release.

2. **If the RPC itself is broken, keep `ENABLE_OUTBOUND_REMINDERS=false`** — the worker won't attempt to claim jobs.

---

## Scenario 4 — QStash webhook delivering to wrong endpoint or failing

### Immediate actions

1. **QStash retries are safe** — the worker is idempotent (checks reminder status, verifies lease).
2. **Verify webhook signatures** — the worker validates `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`.
3. **If QStash is misconfigured**, pause via `ENABLE_OUTBOUND_REMINDERS=false` and fix the endpoint URL.

---

## What NOT to do

| ❌ Action | Reason |
|-----------|--------|
| Disable `trg_customers_enforce_notes_role` | Security trigger — protects customer data |
| `DROP TABLE appointment_reminders CASCADE` | Data loss — use status updates instead |
| Delete rows from `appointment_reminders` | Lose audit trail — mark as `skipped` instead |
| Modify `claim_due_reminders_atomic` grants | Security boundary — only `service_role` may execute |
| Set `ENABLE_OUTBOUND_REMINDERS=true` without verification | Could resume sending incorrect emails |

---

## Rollback (last resort)

If the entire migration must be reversed:

```sql
-- 1. Remove triggers (safe)
DROP TRIGGER IF EXISTS trg_appointments_reminder_lifecycle ON public.appointments;
DROP FUNCTION IF EXISTS public.fn_appointments_reminder_lifecycle_trigger();

-- 2. Archive and remove reminder table
-- IMPORTANT: Export data first if needed for audit
ALTER TABLE public.appointment_reminders RENAME TO appointment_reminders_archived_YYYYMMDD;

-- 3. Remove added columns
ALTER TABLE public.appointments DROP COLUMN IF EXISTS reminder_generation;
ALTER TABLE public.business_notification_settings DROP COLUMN IF EXISTS reminders_enabled;
ALTER TABLE public.business_notification_settings DROP COLUMN IF EXISTS reminder_timing_hours;

-- 4. Remove claim function
DROP FUNCTION IF EXISTS public.claim_due_reminders_atomic(INTEGER, INTEGER);

-- NOTE: Do NOT remove fn_customers_enforce_notes_role or its trigger.
-- That is a permanent security control, not part of the reminder feature.
```

This is a **forward-recovery** approach. The customer notes trigger and its function should **never** be removed as part of reminder rollback — they are an independent security control.
