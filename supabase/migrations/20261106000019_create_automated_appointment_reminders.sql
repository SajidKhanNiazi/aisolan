-- ==============================================================================
-- Migration: 20261106000019_create_automated_appointment_reminders.sql
-- Module: Automated Appointment Email Reminders (P0 Production Feature)
-- Standards: Concurrency-safe FOR UPDATE SKIP LOCKED, tenant isolation,
--            dynamic reschedule & cancellation invalidation, late-booking protection.
-- ==============================================================================

-- 1. Extend business notification settings with reminder toggles and timing
-- Production Safety: Default reminders_enabled is set to FALSE so no outbound emails
-- are dispatched without explicit salon owner opt-in and global feature flag authorization.
ALTER TABLE public.business_notification_settings
    ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reminder_timing_hours INTEGER NOT NULL DEFAULT 3 
        CONSTRAINT chk_reminder_timing_hours CHECK (reminder_timing_hours IN (2, 3, 24));

-- 2. Add reminder scheduling generation tracker to appointments table
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS reminder_generation INTEGER NOT NULL DEFAULT 1;

-- 3. Create appointment reminders queue table
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
    reminder_type TEXT NOT NULL DEFAULT 'email',
    due_at TIMESTAMPTZ NOT NULL,
    generation INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' 
        CONSTRAINT chk_appointment_reminders_status 
        CHECK (status IN ('pending', 'processing', 'sent', 'cancelled', 'skipped', 'failed', 'retry_pending')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ NULL,
    lease_expires_at TIMESTAMPTZ NULL,
    provider_message_id TEXT NULL,
    sent_at TIMESTAMPTZ NULL,
    last_error_code TEXT NULL,
    last_error_message TEXT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast atomic claiming and tenant lookup
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_due_status
    ON public.appointment_reminders (due_at, next_attempt_at)
    WHERE status IN ('pending', 'retry_pending');

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_gen
    ON public.appointment_reminders (appointment_id, generation);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_business_status
    ON public.appointment_reminders (business_id, status, created_at DESC);

-- 4. Enable RLS and restrict direct mutations
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_reminders_select_member"
    ON public.appointment_reminders FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.appointment_reminders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.appointment_reminders TO authenticated;

-- 5. Atomic Batch Claim Function for Reminder Worker
CREATE OR REPLACE FUNCTION public.claim_due_reminders_atomic(
    p_batch_size INTEGER DEFAULT 10,
    p_lease_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    appointment_id UUID,
    customer_id UUID,
    reminder_type TEXT,
    due_at TIMESTAMPTZ,
    generation INTEGER,
    status TEXT,
    attempt_count INTEGER,
    max_attempts INTEGER,
    dedupe_key TEXT,
    recipient_email TEXT,
    recipient_name TEXT,
    customer_phone TEXT,
    service_name TEXT,
    staff_name TEXT,
    starts_at TIMESTAMPTZ,
    service_ends_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    price_minor INTEGER,
    currency TEXT,
    business_name TEXT,
    business_slug TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_timezone TEXT,
    business_address TEXT,
    appointment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_lease_duration INTERVAL;
    v_now TIMESTAMPTZ;
BEGIN
    -- Enforce service-role or database superuser execution boundary.
    -- NOTE: session_user is a bare SQL keyword (not pg_catalog.session_user).
    -- Inside SECURITY DEFINER: current_user = function owner, session_user = original caller.
    IF NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), '') NOT IN ('service_role')
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Forbidden: claim_due_reminders_atomic is strictly reserved for service-role background workers'
            USING ERRCODE = '42501';
    END IF;

    v_lease_duration := (COALESCE(p_lease_seconds, 300) || ' seconds')::INTERVAL;
    v_now := clock_timestamp();

    RETURN QUERY
    WITH due_jobs AS (
        SELECT r.id AS target_id
        FROM public.appointment_reminders r
        WHERE (
            -- New or retryable due reminders
            (r.status IN ('pending', 'retry_pending') AND r.due_at <= v_now AND r.next_attempt_at <= v_now)
            OR
            -- Expired lease recovery
            (r.status = 'processing' AND r.lease_expires_at IS NOT NULL AND r.lease_expires_at <= v_now)
        )
        AND r.attempt_count < r.max_attempts
        ORDER BY r.due_at ASC
        LIMIT COALESCE(p_batch_size, 10)
        FOR UPDATE OF r SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.appointment_reminders r
        SET status = 'processing',
            claimed_at = v_now,
            lease_expires_at = v_now + v_lease_duration,
            attempt_count = r.attempt_count + 1,
            updated_at = v_now
        FROM due_jobs
        WHERE r.id = due_jobs.target_id
        RETURNING r.*
    )
    SELECT
        c.id,
        c.business_id,
        c.appointment_id,
        c.customer_id,
        c.reminder_type,
        c.due_at,
        c.generation,
        c.status,
        c.attempt_count,
        c.max_attempts,
        c.dedupe_key,
        cust.email AS recipient_email,
        COALESCE(cust.name, a.customer_name_snapshot, 'Customer') AS recipient_name,
        cust.phone AS customer_phone,
        a.service_name_snapshot AS service_name,
        COALESCE(st.display_name, 'Specialist') AS staff_name,
        a.starts_at,
        a.service_ends_at,
        a.duration_minutes_snapshot AS duration_minutes,
        a.price_minor_snapshot AS price_minor,
        a.currency_snapshot AS currency,
        b.name AS business_name,
        b.slug AS business_slug,
        b.phone AS business_phone,
        b.email AS business_email,
        COALESCE(a.timezone_snapshot, b.timezone, 'Europe/London') AS business_timezone,
        pg_catalog.btrim(COALESCE(b.address_line1, '') || ' ' || COALESCE(b.city, '')) AS business_address,
        a.status AS appointment_status
    FROM claimed c
    JOIN public.appointments a ON a.id = c.appointment_id
    JOIN public.businesses b ON b.id = c.business_id
    LEFT JOIN public.customers cust ON cust.id = c.customer_id
    LEFT JOIN public.staff_profiles st ON st.id = a.staff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_reminders_atomic(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_reminders_atomic(INTEGER, INTEGER) TO service_role;

-- 6. Trigger Function to automatically schedule and invalidate reminders
CREATE OR REPLACE FUNCTION public.fn_appointments_reminder_lifecycle_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_settings RECORD;
    v_reminders_enabled BOOLEAN;
    v_reminder_hours INTEGER;
    v_due_at TIMESTAMPTZ;
    v_cust_email TEXT;
    v_dedupe TEXT;
    v_now TIMESTAMPTZ;
    v_new_gen INTEGER;
BEGIN
    v_now := clock_timestamp();

    -- Fetch notification settings for the salon
    SELECT reminders_enabled, reminder_timing_hours
    INTO v_settings
    FROM public.business_notification_settings
    WHERE business_id = NEW.business_id;

    v_reminders_enabled := COALESCE(v_settings.reminders_enabled, FALSE);
    v_reminder_hours := COALESCE(v_settings.reminder_timing_hours, 3);

    -- Fetch customer email
    SELECT email INTO v_cust_email
    FROM public.customers
    WHERE id = NEW.customer_id AND business_id = NEW.business_id;

    -- =========================================================================
    -- EVENT 1: INSERT (New Appointment)
    -- =========================================================================
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IN ('confirmed', 'pending') AND v_reminders_enabled THEN
            -- Calculate due time: starts_at - reminder_hours
            v_due_at := NEW.starts_at - (v_reminder_hours || ' hours')::INTERVAL;

            -- Only schedule if reminder is in the future AND customer has a valid email address
            -- If appointment is booked inside the window (due_at <= now), skip scheduling (late booking rule)
            IF v_due_at > v_now AND v_cust_email IS NOT NULL AND v_cust_email ~* '^.+@.+\..+$' THEN
                v_dedupe := NEW.id::text || ':reminder:gen1:' || v_reminder_hours || 'h';
                INSERT INTO public.appointment_reminders (
                    business_id,
                    appointment_id,
                    customer_id,
                    reminder_type,
                    due_at,
                    generation,
                    status,
                    dedupe_key
                ) VALUES (
                    NEW.business_id,
                    NEW.id,
                    NEW.customer_id,
                    'email',
                    v_due_at,
                    1,
                    'pending',
                    v_dedupe
                )
                ON CONFLICT (dedupe_key) DO NOTHING;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    -- =========================================================================
    -- EVENT 2: UPDATE (Cancellation, Reschedule, or Ineligibility)
    -- =========================================================================
    IF TG_OP = 'UPDATE' THEN
        -- Case A: Appointment Cancelled, Completed, or Marked No-Show
        IF NEW.status IN ('cancelled', 'completed', 'no_show') AND OLD.status NOT IN ('cancelled', 'completed', 'no_show') THEN
            UPDATE public.appointment_reminders
            SET status = 'cancelled',
                last_error_message = 'Superseded by appointment status transition to ' || NEW.status,
                updated_at = v_now
            WHERE appointment_id = NEW.id
              AND status IN ('pending', 'retry_pending');
            RETURN NEW;
        END IF;

        -- Case B: Appointment Rescheduled (starts_at changed)
        IF NEW.starts_at <> OLD.starts_at THEN
            -- Invalidate previous pending reminders for this appointment
            UPDATE public.appointment_reminders
            SET status = 'cancelled',
                last_error_message = 'Superseded by appointment reschedule',
                updated_at = v_now
            WHERE appointment_id = NEW.id
              AND status IN ('pending', 'retry_pending');

            -- Calculate new reminder generation
            v_new_gen := COALESCE(NEW.reminder_generation, COALESCE(OLD.reminder_generation, 1) + 1);

            -- If appointment remains active and reminders enabled, schedule for new time
            IF NEW.status IN ('confirmed', 'pending') AND v_reminders_enabled THEN
                v_due_at := NEW.starts_at - (v_reminder_hours || ' hours')::INTERVAL;

                IF v_due_at > v_now AND v_cust_email IS NOT NULL AND v_cust_email ~* '^.+@.+\..+$' THEN
                    v_dedupe := NEW.id::text || ':reminder:gen' || v_new_gen || ':' || v_reminder_hours || 'h';
                    INSERT INTO public.appointment_reminders (
                        business_id,
                        appointment_id,
                        customer_id,
                        reminder_type,
                        due_at,
                        generation,
                        status,
                        dedupe_key
                    ) VALUES (
                        NEW.business_id,
                        NEW.id,
                        NEW.customer_id,
                        'email',
                        v_due_at,
                        v_new_gen,
                        'pending',
                        v_dedupe
                    )
                    ON CONFLICT (dedupe_key) DO NOTHING;
                END IF;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS trg_appointments_reminder_lifecycle ON public.appointments;

CREATE TRIGGER trg_appointments_reminder_lifecycle
    AFTER INSERT OR UPDATE OF status, starts_at
    ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_appointments_reminder_lifecycle_trigger();

-- 7. Database Boundary Security: Enforce Owner/Manager Role for Customer Notes
-- Prevents regular staff users or compromised anon tokens from modifying customer notes
-- via direct Supabase PostgREST requests, bypassing server actions, or altering customer IDs.
CREATE OR REPLACE FUNCTION public.fn_customers_enforce_notes_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
    v_is_authorized BOOLEAN;
    v_auth_role TEXT;
BEGIN
    -- 1. If notes column has not been modified, allow update to proceed
    IF OLD.notes IS NOT DISTINCT FROM NEW.notes THEN
        RETURN NEW;
    END IF;

    -- 2. Tenant immutability: customers cannot be reassigned to another business
    IF OLD.business_id <> NEW.business_id THEN
        RAISE EXCEPTION 'Forbidden: Reassigning customer organization is prohibited'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Retrieve authentication context
    v_auth_role := NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), '');
    IF v_auth_role IS NULL THEN
        BEGIN
            v_auth_role := auth.role();
        EXCEPTION WHEN OTHERS THEN
            v_auth_role := NULL;
        END;
    END IF;

    -- 4. Trusted backend bypass: allow only genuine service_role or database superuser.
    -- Never treat generic auth.uid() IS NULL as trusted, preventing anonymous PostgREST bypass.
    -- NOTE: session_user is a bare SQL keyword (not pg_catalog.session_user).
    IF v_auth_role = 'service_role' 
       OR (v_auth_role IS NULL AND session_user IN ('postgres', 'supabase_admin')) THEN
        RETURN NEW;
    END IF;

    -- 5. Anonymous or unauthenticated callers are strictly blocked
    v_uid := auth.uid();
    IF v_uid IS NULL OR v_auth_role = 'anon' THEN
        RAISE EXCEPTION 'Forbidden: Unauthenticated callers cannot modify customer notes'
            USING ERRCODE = '42501';
    END IF;

    -- 6. Verify caller is an active owner or manager of the customer's tenant
    SELECT EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = NEW.business_id 
          AND user_id = v_uid 
          AND role IN ('owner', 'manager')
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only salon owners or managers may update customer notes'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_enforce_notes_role ON public.customers;

CREATE TRIGGER trg_customers_enforce_notes_role
    BEFORE UPDATE OF notes
    ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_customers_enforce_notes_role();


