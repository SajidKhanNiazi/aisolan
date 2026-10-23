-- ==============================================================================
-- Migration: 20261023000011_create_google_calendar_sync.sql
-- Description: Phase 1G-B Multi-Tenant Google Calendar Integration
--              Stores encrypted OAuth refresh tokens, destination calendar selection,
--              appointment event mappings, and durable asynchronous sync outbox.
-- Security: SET search_path = '', fully schema-qualified objects, RLS enforced,
--           Column-level security revoking encrypted_refresh_token from authenticated tenants.
-- ==============================================================================

-- 1. BUSINESS CALENDAR CONNECTIONS TABLE
-- Stores Google OAuth connection credentials and sync preferences per salon business.
CREATE TABLE IF NOT EXISTS public.business_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_account_email TEXT NOT NULL,
    google_calendar_id TEXT NULL DEFAULT 'primary',
    google_calendar_name TEXT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'disconnected', 'needs_reconnect', 'error')),
    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_successful_sync_at TIMESTAMPTZ NULL,
    last_error_code TEXT NULL,
    last_error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Exactly one Google Calendar connection per salon business
    CONSTRAINT uq_business_calendar_connections_biz UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_calendar_connections_biz
    ON public.business_calendar_connections (business_id);

ALTER TABLE public.business_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Business members can view their own business calendar connection metadata
CREATE POLICY "calendar_connections_select_member"
    ON public.business_calendar_connections FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

-- Only business owners/managers can modify connection configuration
CREATE POLICY "calendar_connections_modify_owner"
    ON public.business_calendar_connections FOR ALL
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

-- SECURITY & PRIVACY ENFORCEMENT:
-- Grant SELECT ONLY on non-sensitive connection metadata columns to authenticated business members.
-- Strictly revoke SELECT on 'encrypted_refresh_token' so raw refresh tokens can never be queried by client components.
REVOKE ALL ON TABLE public.business_calendar_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id, business_id, user_id, google_account_email, google_calendar_id, 
    google_calendar_name, status, sync_enabled, last_successful_sync_at, 
    last_error_code, last_error_message, created_at, updated_at
) ON TABLE public.business_calendar_connections TO authenticated;

-- Service role has full access for OAuth exchange, token refresh, and background syncing
GRANT ALL ON TABLE public.business_calendar_connections TO service_role;


-- 2. APPOINTMENT CALENDAR EVENTS TABLE
-- Maps internal BookPilot appointments to external Google Calendar events for idempotent reconciliation.
CREATE TABLE IF NOT EXISTS public.appointment_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.business_calendar_connections(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    google_calendar_id TEXT NOT NULL,
    last_synchronized_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'synced' 
        CHECK (status IN ('synced', 'sync_failed', 'deleted')),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Exactly one Google event mapping per appointment
    CONSTRAINT uq_appointment_calendar_events_appt UNIQUE (business_id, appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_calendar_events_lookup
    ON public.appointment_calendar_events (business_id, appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_calendar_events_google
    ON public.appointment_calendar_events (google_calendar_id, google_event_id);

ALTER TABLE public.appointment_calendar_events ENABLE ROW LEVEL SECURITY;

-- Business members can view calendar event mapping metadata
CREATE POLICY "calendar_events_select_member"
    ON public.appointment_calendar_events FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

GRANT SELECT ON TABLE public.appointment_calendar_events TO authenticated;
GRANT ALL ON TABLE public.appointment_calendar_events TO service_role;
REVOKE ALL ON TABLE public.appointment_calendar_events FROM PUBLIC, anon;


-- 3. CALENDAR SYNC OUTBOX TABLE
-- Durable transactional queue for asynchronous external Google Calendar synchronization.
CREATE TABLE IF NOT EXISTS public.calendar_sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    action TEXT NOT NULL 
        CHECK (action IN ('create', 'update', 'delete')),
    connection_id UUID NULL REFERENCES public.business_calendar_connections(id) ON DELETE SET NULL,
    source_version TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' 
        CHECK (status IN ('queued', 'processing', 'completed', 'retry_pending', 'failed', 'skipped')),
    attempt_count INTEGER NOT NULL DEFAULT 0 
        CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5 
        CHECK (max_attempts >= 1),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ NULL,
    lease_expires_at TIMESTAMPTZ NULL,
    last_error_code TEXT NULL,
    last_error_message TEXT NULL,
    dedupe_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Concurrency & Tenant Deduplication Constraint
    CONSTRAINT uq_calendar_sync_outbox_business_dedupe UNIQUE (business_id, dedupe_key)
);

-- Priority index for atomic worker claims of pending/retryable sync jobs
CREATE INDEX IF NOT EXISTS idx_calendar_sync_outbox_queue_claim
    ON public.calendar_sync_outbox (next_attempt_at ASC, created_at ASC)
    WHERE status IN ('queued', 'retry_pending');

-- Stale lease recovery index
CREATE INDEX IF NOT EXISTS idx_calendar_sync_outbox_stale_lease
    ON public.calendar_sync_outbox (lease_expires_at ASC)
    WHERE status = 'processing';

-- Appointment lookup index
CREATE INDEX IF NOT EXISTS idx_calendar_sync_outbox_appointment
    ON public.calendar_sync_outbox (appointment_id);

ALTER TABLE public.calendar_sync_outbox ENABLE ROW LEVEL SECURITY;

-- Business members can view their sync queue items
CREATE POLICY "calendar_sync_outbox_select_member"
    ON public.calendar_sync_outbox FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

GRANT SELECT ON TABLE public.calendar_sync_outbox TO authenticated;
GRANT ALL ON TABLE public.calendar_sync_outbox TO service_role;
REVOKE ALL ON TABLE public.calendar_sync_outbox FROM PUBLIC, anon;


-- 4. ATOMIC WORKER CLAIM FUNCTION
-- Atomically selects, locks (FOR UPDATE SKIP LOCKED), and marks due calendar sync jobs as 'processing'
-- with a lease timeout to guarantee crash recovery without concurrent worker races.
CREATE OR REPLACE FUNCTION public.claim_due_calendar_sync_jobs_atomic(
    p_batch_size INTEGER DEFAULT 10,
    p_lease_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    appointment_id UUID,
    action TEXT,
    connection_id UUID,
    source_version TEXT,
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
        FROM public.calendar_sync_outbox AS outbox
        WHERE (
            -- Due queued or retryable jobs
            (outbox.status IN ('queued', 'retry_pending') AND outbox.next_attempt_at <= v_now)
            OR
            -- Stale processing jobs whose lease expired (crash recovery)
            (outbox.status = 'processing' AND outbox.lease_expires_at < v_now)
        )
        ORDER BY outbox.next_attempt_at ASC, outbox.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE OF outbox SKIP LOCKED
    )
    UPDATE public.calendar_sync_outbox AS outbox
    SET
        status = 'processing',
        attempt_count = outbox.attempt_count + 1,
        claimed_at = v_now,
        lease_expires_at = v_lease_expiry,
        updated_at = v_now
    FROM due_jobs
    WHERE outbox.id = due_jobs.target_id
    RETURNING
        outbox.id,
        outbox.business_id,
        outbox.appointment_id,
        outbox.action,
        outbox.connection_id,
        outbox.source_version,
        outbox.payload,
        outbox.status,
        outbox.attempt_count,
        outbox.max_attempts,
        outbox.next_attempt_at,
        outbox.dedupe_key,
        outbox.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_calendar_sync_jobs_atomic(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_calendar_sync_jobs_atomic(INTEGER, INTEGER) TO service_role;


-- 5. GOOGLE OAUTH STATE REPLAY TRACKING TABLE & ATOMIC CONSUMPTION
-- Guarantees that every OAuth authorization state nonce is strictly single-use and bounded to tenant and user.
CREATE TABLE IF NOT EXISTS public.google_calendar_oauth_states (
    nonce TEXT PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_oauth_states_lookup
    ON public.google_calendar_oauth_states (nonce, business_id, user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_oauth_states_expiry
    ON public.google_calendar_oauth_states (expires_at)
    WHERE consumed_at IS NULL;

ALTER TABLE public.google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;

-- Revoke all client access; service_role only
REVOKE ALL ON TABLE public.google_calendar_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.google_calendar_oauth_states TO service_role;

-- Atomic state consumption function:
-- Returns TRUE if and only if the nonce exists, matches tenant and user, is unconsumed, and unexpired.
CREATE OR REPLACE FUNCTION public.consume_google_oauth_nonce_atomic(
    p_nonce TEXT,
    p_business_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated_rows INTEGER;
BEGIN
    UPDATE public.google_calendar_oauth_states
    SET consumed_at = pg_catalog.clock_timestamp()
    WHERE nonce = p_nonce
      AND business_id = p_business_id
      AND user_id = p_user_id
      AND consumed_at IS NULL
      AND expires_at > pg_catalog.clock_timestamp();

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    RETURN v_updated_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_google_oauth_nonce_atomic(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_google_oauth_nonce_atomic(TEXT, UUID, UUID) TO service_role;


-- 5. TRANSACTIONAL APPOINTMENTS TRIGGER FOR GOOGLE CALENDAR SYNC
-- Automatically captures appointment lifecycle events (new booking, reschedule, cancellation)
-- and enqueues them into calendar_sync_outbox if the salon has an active Google Calendar connection.
CREATE OR REPLACE FUNCTION public.fn_appointments_calendar_sync_outbox_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_connection RECORD;
    v_business RECORD;
    v_customer RECORD;
    v_service RECORD;
    v_staff RECORD;
    v_payload JSONB;
    v_sync_version TEXT;
    v_dedupe_key TEXT;
    v_action TEXT;
BEGIN
    -- Check if business has an active Google Calendar connection with sync enabled
    SELECT id, google_calendar_id, sync_enabled, status
    INTO v_connection
    FROM public.business_calendar_connections
    WHERE business_id = NEW.business_id 
      AND status = 'active'
      AND sync_enabled = TRUE;

    -- If no active sync connection exists, skip silently without enqueuing
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Fetch Business Metadata
    SELECT name, slug, timezone
    INTO v_business
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Fetch Customer Details
    SELECT name, email, phone
    INTO v_customer
    FROM public.customers
    WHERE id = NEW.customer_id AND business_id = NEW.business_id;

    -- Fetch Staff Details
    SELECT display_name
    INTO v_staff
    FROM public.staff_profiles
    WHERE id = NEW.staff_id AND business_id = NEW.business_id;

    -- Base Sync Payload
    v_payload := pg_catalog.jsonb_build_object(
        'business_name', v_business.name,
        'business_slug', v_business.slug,
        'business_timezone', COALESCE(NEW.timezone_snapshot, v_business.timezone, 'Europe/London'),
        'customer_name', COALESCE(v_customer.name, NEW.customer_name_snapshot, 'Valued Customer'),
        'customer_email', v_customer.email,
        'customer_phone', v_customer.phone,
        'service_name', NEW.service_name_snapshot,
        'staff_name', COALESCE(v_staff.display_name, 'Specialist'),
        'starts_at', NEW.starts_at,
        'service_ends_at', NEW.service_ends_at,
        'status', NEW.status,
        'booking_reference', pg_catalog.upper(pg_catalog.substr(NEW.id::text, 1, 8)),
        'cancellation_reason', NEW.cancellation_reason
    );

    v_sync_version := pg_catalog.to_char(NEW.updated_at, 'YYYYMMDDHH24MISS');

    -- =========================================================================
    -- EVENT A: INSERT (New Appointment)
    -- =========================================================================
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IN ('confirmed', 'pending') THEN
            v_action := 'create';
            v_dedupe_key := NEW.id::text || ':create';

            INSERT INTO public.calendar_sync_outbox (
                business_id,
                appointment_id,
                action,
                connection_id,
                source_version,
                payload,
                dedupe_key
            ) VALUES (
                NEW.business_id,
                NEW.id,
                v_action,
                v_connection.id,
                v_sync_version,
                v_payload,
                v_dedupe_key
            )
            ON CONFLICT (business_id, dedupe_key) DO NOTHING;
        END IF;

        RETURN NEW;
    END IF;

    -- =========================================================================
    -- EVENT B: UPDATE (Reschedule or Cancellation)
    -- =========================================================================
    IF TG_OP = 'UPDATE' THEN
        -- Case B1: Status transitioned to 'cancelled'
        IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
            -- Supersede any earlier queued or retryable create/update jobs for this appointment
            UPDATE public.calendar_sync_outbox
            SET status = 'skipped',
                last_error_message = 'Superseded by appointment cancellation',
                updated_at = pg_catalog.clock_timestamp()
            WHERE appointment_id = NEW.id
              AND status IN ('queued', 'retry_pending');

            v_action := 'delete';
            v_dedupe_key := NEW.id::text || ':delete';

            INSERT INTO public.calendar_sync_outbox (
                business_id,
                appointment_id,
                action,
                connection_id,
                source_version,
                payload,
                dedupe_key
            ) VALUES (
                NEW.business_id,
                NEW.id,
                v_action,
                v_connection.id,
                v_sync_version,
                v_payload,
                v_dedupe_key
            )
            ON CONFLICT (business_id, dedupe_key) DO NOTHING;

            RETURN NEW;
        END IF;

        -- Case B2: Reschedule (starts_at, service_ends_at, or staff changed while active)
        IF (NEW.starts_at <> OLD.starts_at OR NEW.service_ends_at <> OLD.service_ends_at OR NEW.staff_id <> OLD.staff_id)
           AND NEW.status IN ('confirmed', 'pending') THEN
            
            -- Supersede earlier queued or retryable create/update jobs for this appointment
            UPDATE public.calendar_sync_outbox
            SET status = 'skipped',
                last_error_message = 'Superseded by newer appointment reschedule',
                updated_at = pg_catalog.clock_timestamp()
            WHERE appointment_id = NEW.id
              AND action IN ('create', 'update')
              AND status IN ('queued', 'retry_pending');

            v_action := 'update';
            v_dedupe_key := NEW.id::text || ':update:' || v_sync_version;

            INSERT INTO public.calendar_sync_outbox (
                business_id,
                appointment_id,
                action,
                connection_id,
                source_version,
                payload,
                dedupe_key
            ) VALUES (
                NEW.business_id,
                NEW.id,
                v_action,
                v_connection.id,
                v_sync_version,
                v_payload,
                v_dedupe_key
            )
            ON CONFLICT (business_id, dedupe_key) DO NOTHING;

            RETURN NEW;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Nonessential external sync errors must NEVER roll back a valid appointment transaction
        RAISE WARNING '[fn_appointments_calendar_sync_outbox_trigger] Nonessential sync error suppressed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_appointments_calendar_sync_outbox_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_appointments_calendar_sync_outbox_trigger() TO service_role;

-- Drop trigger if it previously existed
DROP TRIGGER IF EXISTS trg_appointments_calendar_sync_outbox ON public.appointments;

-- Attach trigger to public.appointments
CREATE TRIGGER trg_appointments_calendar_sync_outbox
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_appointments_calendar_sync_outbox_trigger();
