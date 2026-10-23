-- ==============================================================================
-- Migration: 20261022000010_create_notification_outbox.sql
-- Description: Phase 1G-A Production-Ready Transactional Notification Outbox,
--              Owner Notification Preferences, Atomic Worker Claiming, and
--              Database Transaction-Aligned Event Generation Triggers.
-- Security: SET search_path = '', fully schema-qualified objects, RLS enforced.
-- ==============================================================================

-- 1. BUSINESS NOTIFICATION SETTINGS TABLE
-- Stores salon owner notification preferences per tenant business.
CREATE TABLE IF NOT EXISTS public.business_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    notify_on_new_booking BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_reschedule BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_cancellation BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_notification_settings_biz
    ON public.business_notification_settings (business_id);

ALTER TABLE public.business_notification_settings ENABLE ROW LEVEL SECURITY;

-- Business members can view their own business notification settings
CREATE POLICY "notification_settings_select_member"
    ON public.business_notification_settings FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

-- Only business owners/managers can update notification preferences
CREATE POLICY "notification_settings_update_owner"
    ON public.business_notification_settings FOR UPDATE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "notification_settings_insert_owner"
    ON public.business_notification_settings FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE ON TABLE public.business_notification_settings TO authenticated;
GRANT ALL ON TABLE public.business_notification_settings TO service_role;
REVOKE ALL ON TABLE public.business_notification_settings FROM PUBLIC, anon;

-- 2. NOTIFICATION OUTBOX TABLE
-- Durable transactional queue recording all customer and owner transactional notifications.
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL 
        CHECK (event_type IN ('new_booking', 'reschedule', 'cancellation')),
    recipient_type TEXT NOT NULL 
        CHECK (recipient_type IN ('customer', 'owner')),
    recipient_email TEXT NOT NULL 
        CHECK (char_length(trim(recipient_email)) >= 3 AND recipient_email ~* '^.+@.+\..+$'),
    recipient_name TEXT NULL,
    template_key TEXT NOT NULL 
        CHECK (template_key IN (
            'customer_booking_confirmation',
            'customer_rescheduling_confirmation',
            'customer_cancellation_confirmation',
            'owner_new_booking_alert',
            'owner_reschedule_alert',
            'owner_cancellation_alert'
        )),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' 
        CHECK (status IN ('queued', 'processing', 'sent', 'retry_pending', 'failed', 'skipped')),
    attempt_count INTEGER NOT NULL DEFAULT 0 
        CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5 
        CHECK (max_attempts >= 1),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ NULL,
    lease_expires_at TIMESTAMPTZ NULL,
    provider_message_id TEXT NULL,
    last_error_code TEXT NULL,
    last_error_message TEXT NULL,
    dedupe_key TEXT NOT NULL,
    sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Concurrency & Tenant Deduplication Constraint
    CONSTRAINT uq_notification_outbox_business_dedupe UNIQUE (business_id, dedupe_key)
);

-- Priority index for atomic worker claims of pending/retryable jobs
CREATE INDEX IF NOT EXISTS idx_notification_outbox_queue_claim
    ON public.notification_outbox (next_attempt_at ASC, created_at ASC)
    WHERE status IN ('queued', 'retry_pending');

-- Stale lease recovery index
CREATE INDEX IF NOT EXISTS idx_notification_outbox_stale_lease
    ON public.notification_outbox (lease_expires_at ASC)
    WHERE status = 'processing';

-- Tenant history lookup index
CREATE INDEX IF NOT EXISTS idx_notification_outbox_business_history
    ON public.notification_outbox (business_id, created_at DESC);

-- Appointment association index
CREATE INDEX IF NOT EXISTS idx_notification_outbox_appointment
    ON public.notification_outbox (appointment_id);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Business members can view their own tenant notification logs in dashboard
CREATE POLICY "notification_outbox_select_member"
    ON public.notification_outbox FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

-- All mutations are restricted to server-side service role and triggers
REVOKE ALL ON TABLE public.notification_outbox FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.notification_outbox TO authenticated;
GRANT ALL ON TABLE public.notification_outbox TO service_role;

-- 3. ATOMIC WORKER CLAIM FUNCTION
-- Atomically selects, locks (FOR UPDATE SKIP LOCKED), and marks due notifications as 'processing'
-- with a lease timeout to guarantee crash recovery without concurrent worker races.
CREATE OR REPLACE FUNCTION public.claim_due_notifications_atomic(
    p_batch_size INTEGER DEFAULT 10,
    p_lease_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    appointment_id UUID,
    customer_id UUID,
    event_type TEXT,
    recipient_type TEXT,
    recipient_email TEXT,
    recipient_name TEXT,
    template_key TEXT,
    payload JSONB,
    status TEXT,
    attempt_count INTEGER,
    max_attempts INTEGER,
    next_attempt_at TIMESTAMPTZ,
    dedupe_key TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_lease_expiry TIMESTAMPTZ := v_now + (p_lease_seconds || ' seconds')::interval;
BEGIN
    RETURN QUERY
    WITH due_jobs AS (
        SELECT outbox.id AS target_id
        FROM public.notification_outbox AS outbox
        WHERE (
            -- Due queued or retryable jobs
            (outbox.status IN ('queued', 'retry_pending') AND outbox.next_attempt_at <= v_now)
            OR
            -- Stale processing jobs whose lease expired (crash recovery)
            (outbox.status = 'processing' AND outbox.lease_expires_at < v_now)
        )
        ORDER BY outbox.next_attempt_at ASC, outbox.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.notification_outbox AS o
        SET status = 'processing',
            claimed_at = v_now,
            lease_expires_at = v_lease_expiry,
            attempt_count = o.attempt_count + 1,
            updated_at = v_now
        FROM due_jobs
        WHERE o.id = due_jobs.target_id
        RETURNING 
            o.id,
            o.business_id,
            o.appointment_id,
            o.customer_id,
            o.event_type,
            o.recipient_type,
            o.recipient_email,
            o.recipient_name,
            o.template_key,
            o.payload,
            o.status,
            o.attempt_count,
            o.max_attempts,
            o.next_attempt_at,
            o.dedupe_key,
            o.created_at
    )
    SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_notifications_atomic(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_notifications_atomic(INTEGER, INTEGER) TO service_role;

-- 4. TRANSACTIONAL EVENT GENERATION TRIGGER ON APPOINTMENTS
-- Runs inside the exact same database transaction as appointment commits.
-- Guarantees that if a booking rolls back, no notification is queued.
-- Guarantees that when a booking commits, outbox rows are durably enqueued.
CREATE OR REPLACE FUNCTION public.fn_appointments_notification_outbox_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_biz RECORD;
    v_cust RECORD;
    v_owner RECORD;
    v_settings RECORD;
    v_staff_name TEXT;
    v_payload JSONB;
    v_customer_email TEXT;
    v_customer_name TEXT;
    v_dedupe TEXT;
    v_reschedule_version TEXT;
BEGIN
    -- 1. Fetch Business Details
    SELECT name, slug, phone, email, timezone, currency, address_line1, city
    INTO v_biz
    FROM public.businesses
    WHERE id = NEW.business_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- 2. Fetch Customer Details
    SELECT name, email, phone
    INTO v_cust
    FROM public.customers
    WHERE id = NEW.customer_id AND business_id = NEW.business_id;

    v_customer_name := COALESCE(v_cust.name, NEW.customer_name_snapshot, 'Customer');
    v_customer_email := NULLIF(pg_catalog.btrim(COALESCE(v_cust.email, '')), '');

    -- 3. Fetch Staff Name
    SELECT display_name
    INTO v_staff_name
    FROM public.staff_profiles
    WHERE id = NEW.staff_id AND business_id = NEW.business_id;
    v_staff_name := COALESCE(v_staff_name, 'Specialist');

    -- 4. Fetch Owner Notification Preferences (default to true if unconfigured)
    SELECT notify_on_new_booking, notify_on_reschedule, notify_on_cancellation
    INTO v_settings
    FROM public.business_notification_settings
    WHERE business_id = NEW.business_id;

    -- Standard template payload
    v_payload := pg_catalog.jsonb_build_object(
        'business_name', v_biz.name,
        'business_slug', v_biz.slug,
        'business_phone', v_biz.phone,
        'business_email', v_biz.email,
        'business_timezone', COALESCE(NEW.timezone_snapshot, v_biz.timezone, 'Europe/London'),
        'business_address', pg_catalog.btrim(COALESCE(v_biz.address_line1, '') || ' ' || COALESCE(v_biz.city, '')),
        'customer_name', v_customer_name,
        'customer_email', v_customer_email,
        'customer_phone', v_cust.phone,
        'service_name', NEW.service_name_snapshot,
        'staff_name', v_staff_name,
        'starts_at', NEW.starts_at,
        'service_ends_at', NEW.service_ends_at,
        'duration_minutes', NEW.duration_minutes_snapshot,
        'price_minor', NEW.price_minor_snapshot,
        'currency', NEW.currency_snapshot,
        'booking_reference', 'APPT-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(NEW.id::text, '-', ''), 1, 8)),
        'cancellation_reason', NEW.cancellation_reason
    );

    -- =========================================================================
    -- EVENT A: INSERT (New Booking)
    -- =========================================================================
    IF TG_OP = 'INSERT' THEN
        -- Only notify for active new bookings (confirmed or pending)
        IF NEW.status IN ('confirmed', 'pending') THEN
            -- A1. Customer Booking Confirmation Email (if customer has email)
            IF v_customer_email IS NOT NULL AND v_customer_email ~* '^.+@.+\..+$' THEN
                v_dedupe := NEW.id::text || ':new_booking:customer';
                INSERT INTO public.notification_outbox (
                    business_id,
                    appointment_id,
                    customer_id,
                    event_type,
                    recipient_type,
                    recipient_email,
                    recipient_name,
                    template_key,
                    payload,
                    dedupe_key
                ) VALUES (
                    NEW.business_id,
                    NEW.id,
                    NEW.customer_id,
                    'new_booking',
                    'customer',
                    v_customer_email,
                    v_customer_name,
                    'customer_booking_confirmation',
                    v_payload,
                    v_dedupe
                )
                ON CONFLICT (business_id, dedupe_key) DO NOTHING;
            END IF;

            -- A2. Owner New Booking Alert (if enabled)
            IF v_settings.notify_on_new_booking IS NULL OR v_settings.notify_on_new_booking = TRUE THEN
                FOR v_owner IN
                    SELECT DISTINCT u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'Salon Owner') AS owner_name
                    FROM public.business_members bm
                    JOIN auth.users u ON u.id = bm.user_id
                    WHERE bm.business_id = NEW.business_id 
                      AND bm.role IN ('owner', 'manager')
                      AND u.email IS NOT NULL
                LOOP
                    v_dedupe := NEW.id::text || ':new_booking:owner:' || v_owner.email;
                    INSERT INTO public.notification_outbox (
                        business_id,
                        appointment_id,
                        customer_id,
                        event_type,
                        recipient_type,
                        recipient_email,
                        recipient_name,
                        template_key,
                        payload,
                        dedupe_key
                    ) VALUES (
                        NEW.business_id,
                        NEW.id,
                        NEW.customer_id,
                        'new_booking',
                        'owner',
                        v_owner.email,
                        v_owner.owner_name,
                        'owner_new_booking_alert',
                        v_payload,
                        v_dedupe
                    )
                    ON CONFLICT (business_id, dedupe_key) DO NOTHING;
                END LOOP;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    -- =========================================================================
    -- EVENT B: UPDATE (Reschedule or Cancellation)
    -- =========================================================================
    IF TG_OP = 'UPDATE' THEN
        -- B1. CANCELLATION EVENT: status transition to 'cancelled'
        IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
            -- Ordering/Staleness Policy: Mark any earlier queued/retryable confirmation or reschedule
            -- notifications for this appointment as 'skipped' so the customer is not confused.
            UPDATE public.notification_outbox
            SET status = 'skipped',
                last_error_message = 'Superseded by appointment cancellation',
                updated_at = pg_catalog.clock_timestamp()
            WHERE appointment_id = NEW.id
              AND status IN ('queued', 'retry_pending');

            -- Customer Cancellation Email
            IF v_customer_email IS NOT NULL AND v_customer_email ~* '^.+@.+\..+$' THEN
                v_dedupe := NEW.id::text || ':cancellation:customer';
                INSERT INTO public.notification_outbox (
                    business_id,
                    appointment_id,
                    customer_id,
                    event_type,
                    recipient_type,
                    recipient_email,
                    recipient_name,
                    template_key,
                    payload,
                    dedupe_key
                ) VALUES (
                    NEW.business_id,
                    NEW.id,
                    NEW.customer_id,
                    'cancellation',
                    'customer',
                    v_customer_email,
                    v_customer_name,
                    'customer_cancellation_confirmation',
                    v_payload,
                    v_dedupe
                )
                ON CONFLICT (business_id, dedupe_key) DO NOTHING;
            END IF;

            -- Owner Cancellation Alert (if enabled)
            IF v_settings.notify_on_cancellation IS NULL OR v_settings.notify_on_cancellation = TRUE THEN
                FOR v_owner IN
                    SELECT DISTINCT u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'Salon Owner') AS owner_name
                    FROM public.business_members bm
                    JOIN auth.users u ON u.id = bm.user_id
                    WHERE bm.business_id = NEW.business_id 
                      AND bm.role IN ('owner', 'manager')
                      AND u.email IS NOT NULL
                LOOP
                    v_dedupe := NEW.id::text || ':cancellation:owner:' || v_owner.email;
                    INSERT INTO public.notification_outbox (
                        business_id,
                        appointment_id,
                        customer_id,
                        event_type,
                        recipient_type,
                        recipient_email,
                        recipient_name,
                        template_key,
                        payload,
                        dedupe_key
                    ) VALUES (
                        NEW.business_id,
                        NEW.id,
                        NEW.customer_id,
                        'cancellation',
                        'owner',
                        v_owner.email,
                        v_owner.owner_name,
                        'owner_cancellation_alert',
                        v_payload,
                        v_dedupe
                    )
                    ON CONFLICT (business_id, dedupe_key) DO NOTHING;
                END LOOP;
            END IF;

            RETURN NEW;
        END IF;

        -- B2. RESCHEDULING EVENT: starts_at or staff_id changed while active
        IF (NEW.starts_at <> OLD.starts_at OR NEW.staff_id <> OLD.staff_id) 
           AND NEW.status IN ('confirmed', 'pending') 
           AND OLD.status IN ('confirmed', 'pending') THEN
            
            -- Distinct version identifier per reschedule
            v_reschedule_version := pg_catalog.to_char(NEW.starts_at, 'YYYYMMDDHH24MISS') || ':' || NEW.staff_id::text;
            
            -- Enrich payload with old start time for comparison in email
            v_payload := v_payload || pg_catalog.jsonb_build_object(
                'previous_starts_at', OLD.starts_at,
                'previous_service_ends_at', OLD.service_ends_at
            );

            -- Customer Reschedule Confirmation
            IF v_customer_email IS NOT NULL AND v_customer_email ~* '^.+@.+\..+$' THEN
                v_dedupe := NEW.id::text || ':reschedule:' || v_reschedule_version || ':customer';
                INSERT INTO public.notification_outbox (
                    business_id,
                    appointment_id,
                    customer_id,
                    event_type,
                    recipient_type,
                    recipient_email,
                    recipient_name,
                    template_key,
                    payload,
                    dedupe_key
                ) VALUES (
                    NEW.business_id,
                    NEW.id,
                    NEW.customer_id,
                    'reschedule',
                    'customer',
                    v_customer_email,
                    v_customer_name,
                    'customer_rescheduling_confirmation',
                    v_payload,
                    v_dedupe
                )
                ON CONFLICT (business_id, dedupe_key) DO NOTHING;
            END IF;

            -- Owner Reschedule Alert (if enabled)
            IF v_settings.notify_on_reschedule IS NULL OR v_settings.notify_on_reschedule = TRUE THEN
                FOR v_owner IN
                    SELECT DISTINCT u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'Salon Owner') AS owner_name
                    FROM public.business_members bm
                    JOIN auth.users u ON u.id = bm.user_id
                    WHERE bm.business_id = NEW.business_id 
                      AND bm.role IN ('owner', 'manager')
                      AND u.email IS NOT NULL
                LOOP
                    v_dedupe := NEW.id::text || ':reschedule:' || v_reschedule_version || ':owner:' || v_owner.email;
                    INSERT INTO public.notification_outbox (
                        business_id,
                        appointment_id,
                        customer_id,
                        event_type,
                        recipient_type,
                        recipient_email,
                        recipient_name,
                        template_key,
                        payload,
                        dedupe_key
                    ) VALUES (
                        NEW.business_id,
                        NEW.id,
                        NEW.customer_id,
                        'reschedule',
                        'owner',
                        v_owner.email,
                        v_owner.owner_name,
                        'owner_reschedule_alert',
                        v_payload,
                        v_dedupe
                    )
                    ON CONFLICT (business_id, dedupe_key) DO NOTHING;
                END LOOP;
            END IF;

            RETURN NEW;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_appointments_notification_outbox_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_appointments_notification_outbox_trigger() TO service_role;

-- Drop trigger if it previously existed
DROP TRIGGER IF EXISTS trg_appointments_notification_outbox ON public.appointments;

-- Attach trigger to public.appointments
CREATE TRIGGER trg_appointments_notification_outbox
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_appointments_notification_outbox_trigger();
