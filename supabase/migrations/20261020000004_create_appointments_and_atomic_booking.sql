-- ==============================================================================
-- Migration: 20261020000004_create_appointments_and_atomic_booking.sql
-- Description: Hardened Customers table, Appointments table, GiST Double-Booking
--              Exclusion Constraint, Snapshot preservation, RLS Direct-Mutation
--              Protection, and Complete Invariant Atomic RPCs
--              (create_appointment_atomic, reschedule_appointment_atomic,
--               cancel_appointment_atomic, update_appointment_status_atomic).
-- Phase: BookPilot AI Phase 1E-A
-- Security: SET search_path = '', fully schema-qualified objects, direct-mutation revoked.
-- ==============================================================================

-- 1. ENABLE BTREE_GIST EXTENSION
-- Required for GiST multi-column exclusion constraints combining scalar types (UUID) with ranges (tstzrange).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. HELPER FUNCTION: is_business_manager_or_owner
CREATE OR REPLACE FUNCTION public.is_business_manager_or_owner(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = p_business_id 
          AND user_id = p_user_id 
          AND role IN ('owner', 'manager')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_business_manager_or_owner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_manager_or_owner(UUID, UUID) TO authenticated;

-- 3. CUSTOMERS TABLE
-- Tenant-scoped customer directory. Private notes and details shielded from anon.
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NULL,
    phone TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_business_id UNIQUE (business_id, id),
    CONSTRAINT chk_customers_name_length CHECK (char_length(trim(name)) >= 2 AND char_length(name) <= 100),
    CONSTRAINT chk_customers_contact_required CHECK (
        (email IS NOT NULL AND char_length(trim(email)) >= 3) OR 
        (phone IS NOT NULL AND char_length(trim(phone)) >= 3)
    )
);

CREATE INDEX IF NOT EXISTS idx_customers_business_email 
    ON public.customers (business_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_customers_business_phone 
    ON public.customers (business_id, phone);

CREATE INDEX IF NOT EXISTS idx_customers_business_name 
    ON public.customers (business_id, name);

-- 4. APPOINTMENTS TABLE
-- Primary appointment entity with frozen service snapshots and concurrency intervals.
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    service_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    starts_at TIMESTAMPTZ NOT NULL,
    service_ends_at TIMESTAMPTZ NOT NULL,
    occupied_starts_at TIMESTAMPTZ NOT NULL,
    occupied_ends_at TIMESTAMPTZ NOT NULL,
    duration_minutes_snapshot INTEGER NOT NULL 
        CHECK (duration_minutes_snapshot >= 5 AND duration_minutes_snapshot <= 720),
    buffer_before_minutes_snapshot INTEGER NOT NULL DEFAULT 0 
        CHECK (buffer_before_minutes_snapshot >= 0 AND buffer_before_minutes_snapshot <= 120),
    buffer_after_minutes_snapshot INTEGER NOT NULL DEFAULT 0 
        CHECK (buffer_after_minutes_snapshot >= 0 AND buffer_after_minutes_snapshot <= 120),
    price_minor_snapshot INTEGER NOT NULL 
        CHECK (price_minor_snapshot >= 0),
    currency_snapshot TEXT NOT NULL 
        CHECK (char_length(currency_snapshot) = 3),
    service_name_snapshot TEXT NOT NULL,
    customer_name_snapshot TEXT NOT NULL,
    timezone_snapshot TEXT NOT NULL DEFAULT 'Europe/London',
    cancellation_reason TEXT NULL,
    cancelled_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    idempotency_key TEXT NULL,
    created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Composite Tenant Isolation Constraints (Enforced at DB Engine Level)
    CONSTRAINT uq_appointments_business_id UNIQUE (business_id, id),
    CONSTRAINT fk_appointments_customer 
        FOREIGN KEY (business_id, customer_id) 
        REFERENCES public.customers(business_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_service 
        FOREIGN KEY (business_id, service_id) 
        REFERENCES public.services(business_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_staff 
        FOREIGN KEY (business_id, staff_id) 
        REFERENCES public.staff_profiles(business_id, id) ON DELETE RESTRICT,

    -- Temporal Invariant Checks
    CONSTRAINT chk_appointments_starts_before_service_ends 
        CHECK (starts_at < service_ends_at),
    CONSTRAINT chk_appointments_service_ends_before_occupied_ends 
        CHECK (service_ends_at <= occupied_ends_at),
    CONSTRAINT chk_appointments_occupied_starts_before_starts 
        CHECK (occupied_starts_at <= starts_at),
    CONSTRAINT chk_appointments_idempotency_business 
        UNIQUE (business_id, idempotency_key)
);

-- 5. POSTGRESQL DOUBLE-BOOKING EXCLUSION CONSTRAINT
-- Eliminates double-booking at the database engine level via GiST exclusion index.
-- Half-open interval [start, end) allows an appointment to start exactly when the previous occupied ends.
-- Predicate filters out 'cancelled' appointments so released slots can be booked immediately.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exclude_staff_double_booking'
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT exclude_staff_double_booking
            EXCLUDE USING gist (
                business_id WITH =,
                staff_id WITH =,
                tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&
            )
            WHERE (status IN ('confirmed', 'pending', 'completed', 'no_show'));
    END IF;
END $$;

-- Indexes for fast appointment queries and calendar rendering
CREATE INDEX IF NOT EXISTS idx_appointments_business_starts 
    ON public.appointments (business_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_staff_starts 
    ON public.appointments (business_id, staff_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_customer 
    ON public.appointments (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
    ON public.appointments (business_id, status);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY & DIRECT MUTATION BYPASS PROTECTION
-- ==============================================================================

-- A. CUSTOMERS TABLE RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_member"
    ON public.customers FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "customers_insert_member"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "customers_update_member"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()))
    WITH CHECK (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "customers_delete_owner"
    ON public.customers FOR DELETE
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()));

-- B. APPOINTMENTS TABLE RLS & DIRECT-WRITE LOCKDOWN
-- Prevents authenticated users or compromised API keys from bypassing atomic booking invariants.
-- Authenticated members may only SELECT appointments for their authorized workspace.
-- Direct INSERT, UPDATE, and DELETE are strictly REVOKED.
-- All mutations MUST execute through the verified atomic RPCs below.
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_member"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.appointments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.appointments TO authenticated;

-- ==============================================================================
-- 7. ATOMIC RPC FUNCTIONS (SECURITY DEFINER, STRICT AUDIT & VALIDATION)
-- ==============================================================================

-- A. CREATE APPOINTMENT ATOMIC
CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
    p_business_id UUID,
    p_service_id UUID,
    p_staff_id UUID,
    p_starts_at TIMESTAMPTZ,
    p_customer_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_business RECORD;
    v_policy RECORD;
    v_service RECORD;
    v_staff RECORD;
    v_customer_id UUID;
    v_customer_name TEXT;
    v_service_ends_at TIMESTAMPTZ;
    v_occupied_starts_at TIMESTAMPTZ;
    v_occupied_ends_at TIMESTAMPTZ;
    v_appointment RECORD;
    v_local_start TIMESTAMP;
    v_local_service_end TIMESTAMP;
    v_local_occupied_start TIMESTAMP;
    v_local_occupied_end TIMESTAMP;
    v_local_date DATE;
    v_local_time TIME;
    v_local_service_end_time TIME;
    v_local_occupied_start_time TIME;
    v_local_occupied_end_time TIME;
    v_day_of_week SMALLINT;
    v_buffer_before INTEGER := 0;
    v_buffer_after INTEGER := 0;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Caller must be authenticated.');
    END IF;

    -- 2. Verify caller membership in business
    IF NOT public.is_business_member(p_business_id, v_user_id) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_ACCESS_DENIED', 'message', 'Access denied to this business workspace.');
    END IF;

    -- 3. Check idempotency key if provided
    IF p_idempotency_key IS NOT NULL AND pg_catalog.char_length(pg_catalog.trim(p_idempotency_key)) > 0 THEN
        SELECT * INTO v_appointment
        FROM public.appointments
        WHERE business_id = p_business_id AND idempotency_key = pg_catalog.trim(p_idempotency_key);

        IF FOUND THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'data', pg_catalog.to_jsonb(v_appointment)
            );
        END IF;
    END IF;

    -- 4. Load Business and validate timezone
    SELECT id, timezone, currency INTO v_business
    FROM public.businesses
    WHERE id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_NOT_FOUND', 'message', 'Business workspace not found.');
    END IF;

    -- 5. Enforce Business Booking Notice & Advance Policies
    SELECT min_notice_hours, max_advance_days
    INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = p_business_id;

    IF FOUND THEN
        -- Minimum notice check
        IF p_starts_at < (pg_catalog.now() + (pg_catalog.coalesce(v_policy.min_notice_hours, 0) * INTERVAL '1 hour')) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'OUTSIDE_BOOKING_WINDOW',
                'message', 'The requested appointment falls within the minimum required booking notice window.'
            );
        END IF;

        -- Maximum advance booking window check
        IF p_starts_at > (pg_catalog.now() + (pg_catalog.coalesce(v_policy.max_advance_days, 60) * INTERVAL '1 day')) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'OUTSIDE_BOOKING_WINDOW',
                'message', 'The requested appointment is beyond the maximum advance booking window.'
            );
        END IF;
    END IF;

    -- 6. Load Service (must be active and not archived)
    SELECT id, name, price_amount, currency, duration_minutes, buffer_minutes, is_active, is_archived
    INTO v_service
    FROM public.services
    WHERE id = p_service_id AND business_id = p_business_id;

    IF NOT FOUND OR v_service.is_archived THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_SERVICE', 'message', 'The requested service does not exist or has been archived.');
    END IF;

    IF NOT v_service.is_active THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_SERVICE', 'message', 'The requested service is currently inactive.');
    END IF;

    -- 7. Load Staff profile (must be active and not archived)
    SELECT id, display_name, is_active, is_archived
    INTO v_staff
    FROM public.staff_profiles
    WHERE id = p_staff_id AND business_id = p_business_id;

    IF NOT FOUND OR v_staff.is_archived THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_STAFF', 'message', 'The requested staff member does not exist or has been archived.');
    END IF;

    IF NOT v_staff.is_active THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_STAFF', 'message', 'The requested staff member is currently inactive.');
    END IF;

    -- 8. Verify Staff is assigned to the service
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_services
        WHERE business_id = p_business_id AND staff_id = p_staff_id AND service_id = p_service_id
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_NOT_ELIGIBLE', 'message', 'This staff member is not eligible to perform the requested service.');
    END IF;

    -- 9. Customer resolution or creation
    IF p_customer_id IS NOT NULL THEN
        SELECT id, name INTO v_customer_id, v_customer_name
        FROM public.customers
        WHERE id = p_customer_id AND business_id = p_business_id;

        IF NOT FOUND THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_CUSTOMER', 'message', 'Customer record not found in this business.');
        END IF;
    ELSE
        IF p_customer_name IS NULL OR pg_catalog.char_length(pg_catalog.trim(p_customer_name)) < 2 THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'Customer name must be at least 2 characters.');
        END IF;

        IF (p_customer_email IS NULL OR pg_catalog.char_length(pg_catalog.trim(p_customer_email)) < 3) AND 
           (p_customer_phone IS NULL OR pg_catalog.char_length(pg_catalog.trim(p_customer_phone)) < 3) THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'At least one contact method (email or phone) is required for customer.');
        END IF;

        SELECT id, name INTO v_customer_id, v_customer_name
        FROM public.customers
        WHERE business_id = p_business_id
          AND (
              (p_customer_email IS NOT NULL AND pg_catalog.lower(email) = pg_catalog.lower(pg_catalog.trim(p_customer_email))) OR
              (p_customer_phone IS NOT NULL AND phone = pg_catalog.trim(p_customer_phone))
          )
        LIMIT 1;

        IF NOT FOUND THEN
            INSERT INTO public.customers (business_id, name, email, phone)
            VALUES (
                p_business_id,
                pg_catalog.trim(p_customer_name),
                pg_catalog.nullif(pg_catalog.lower(pg_catalog.trim(p_customer_email)), ''),
                pg_catalog.nullif(pg_catalog.trim(p_customer_phone), '')
            )
            RETURNING id, name INTO v_customer_id, v_customer_name;
        END IF;
    END IF;

    -- 10. Compute occupied intervals and buffers
    v_buffer_after := pg_catalog.coalesce(v_service.buffer_minutes, 0);
    v_service_ends_at := p_starts_at + (v_service.duration_minutes * INTERVAL '1 minute');
    v_occupied_starts_at := p_starts_at - (v_buffer_before * INTERVAL '1 minute');
    v_occupied_ends_at := v_service_ends_at + (v_buffer_after * INTERVAL '1 minute');

    -- 11. Local Timezone Conversions for Schedule Policies
    v_local_start := p_starts_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_service_end := v_service_ends_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_occupied_start := v_occupied_starts_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_occupied_end := v_occupied_ends_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');

    v_local_date := v_local_start::date;
    v_local_time := v_local_start::time;
    v_local_service_end_time := v_local_service_end::time;
    v_local_occupied_start_time := v_local_occupied_start::time;
    v_local_occupied_end_time := v_local_occupied_end::time;
    v_day_of_week := pg_catalog.extract(DOW FROM v_local_start)::smallint;

    -- 12. Check Business Schedule Exceptions / Holidays
    IF EXISTS (
        SELECT 1 FROM public.business_schedule_exceptions
        WHERE business_id = p_business_id 
          AND exception_date = v_local_date 
          AND (
              is_closed = TRUE OR
              (open_time IS NOT NULL AND v_local_time < open_time) OR
              (close_time IS NOT NULL AND v_local_service_end_time > close_time)
          )
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_CLOSED', 'message', 'The business is closed on this date (holiday / special closure).');
    END IF;

    -- 13. Check Business Operating Opening Hours (only if no special date exception exists for this date)
    IF NOT EXISTS (
        SELECT 1 FROM public.business_schedule_exceptions
        WHERE business_id = p_business_id AND exception_date = v_local_date
    ) THEN
        IF EXISTS (SELECT 1 FROM public.business_opening_hours WHERE business_id = p_business_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.business_opening_hours
                WHERE business_id = p_business_id
                  AND day_of_week = v_day_of_week
                  AND is_closed = FALSE
                  AND open_time <= v_local_time
                  AND close_time >= v_local_service_end_time
            ) THEN
                RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_CLOSED', 'message', 'The business is closed or the appointment falls outside opening hours on this date.');
            END IF;
        END IF;
    END IF;

    -- 14. Check Staff Weekly Working Shift
    IF EXISTS (SELECT 1 FROM public.staff_working_hours WHERE business_id = p_business_id AND staff_id = p_staff_id) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_working_hours
            WHERE business_id = p_business_id
              AND staff_id = p_staff_id
              AND day_of_week = v_day_of_week
              AND is_working = TRUE
              AND open_time <= v_local_occupied_start_time
              AND close_time >= v_local_occupied_end_time
        ) THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_UNAVAILABLE', 'message', 'The selected staff member is not scheduled to work during this timeslot.');
        END IF;
    END IF;

    -- 15. Check Staff Recurring Breaks
    IF EXISTS (
        SELECT 1 FROM public.staff_breaks
        WHERE business_id = p_business_id
          AND staff_id = p_staff_id
          AND day_of_week = v_day_of_week
          AND v_local_occupied_start_time < end_time
          AND start_time < v_local_occupied_end_time
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_UNAVAILABLE', 'message', 'The requested timeslot overlaps with a scheduled staff break.');
    END IF;

    -- 16. Check Staff Time Off / Leave
    IF EXISTS (
        SELECT 1 FROM public.staff_time_off
        WHERE business_id = p_business_id
          AND staff_id = p_staff_id
          AND start_date <= v_local_date AND end_date >= v_local_date
          AND (
              is_full_day = TRUE OR
              (start_time IS NOT NULL AND end_time IS NOT NULL AND (v_local_occupied_start_time < end_time AND start_time < v_local_occupied_end_time))
          )
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_UNAVAILABLE', 'message', 'The requested staff member is on leave or unavailable during this interval.');
    END IF;

    -- 17. Transactional Insert with Snapshot Preservation
    BEGIN
        INSERT INTO public.appointments (
            business_id,
            customer_id,
            service_id,
            staff_id,
            status,
            starts_at,
            service_ends_at,
            occupied_starts_at,
            occupied_ends_at,
            duration_minutes_snapshot,
            buffer_before_minutes_snapshot,
            buffer_after_minutes_snapshot,
            price_minor_snapshot,
            currency_snapshot,
            service_name_snapshot,
            customer_name_snapshot,
            timezone_snapshot,
            notes,
            idempotency_key,
            created_by
        ) VALUES (
            p_business_id,
            v_customer_id,
            p_service_id,
            p_staff_id,
            'confirmed',
            p_starts_at,
            v_service_ends_at,
            v_occupied_starts_at,
            v_occupied_ends_at,
            v_service.duration_minutes,
            v_buffer_before,
            v_buffer_after,
            v_service.price_amount,
            pg_catalog.coalesce(v_service.currency, 'GBP'),
            v_service.name,
            v_customer_name,
            pg_catalog.coalesce(v_business.timezone, 'Europe/London'),
            p_notes,
            pg_catalog.nullif(pg_catalog.trim(p_idempotency_key), ''),
            v_user_id
        )
        RETURNING * INTO v_appointment;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'is_idempotent_replay', false,
            'data', pg_catalog.to_jsonb(v_appointment)
        );

    EXCEPTION
        WHEN exclusion_violation THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'SLOT_TAKEN',
                'message', 'The selected staff member is already booked for this timeslot or buffer interval.'
            );
        WHEN unique_violation THEN
            IF SQLERRM LIKE '%chk_appointments_idempotency_business%' THEN
                SELECT * INTO v_appointment
                FROM public.appointments
                WHERE business_id = p_business_id AND idempotency_key = pg_catalog.trim(p_idempotency_key);
                RETURN pg_catalog.jsonb_build_object(
                    'success', true,
                    'is_idempotent_replay', true,
                    'data', pg_catalog.to_jsonb(v_appointment)
                );
            ELSE
                RETURN pg_catalog.jsonb_build_object(
                    'success', false,
                    'code', 'CONFLICT',
                    'message', 'A concurrency conflict occurred. Please retry.'
                );
            END IF;
    END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_appointment_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic TO authenticated;

-- B. RESCHEDULE APPOINTMENT ATOMIC
CREATE OR REPLACE FUNCTION public.reschedule_appointment_atomic(
    p_business_id UUID,
    p_appointment_id UUID,
    p_new_starts_at TIMESTAMPTZ,
    p_new_staff_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_appointment RECORD;
    v_business RECORD;
    v_policy RECORD;
    v_target_staff_id UUID;
    v_service_ends_at TIMESTAMPTZ;
    v_occupied_starts_at TIMESTAMPTZ;
    v_occupied_ends_at TIMESTAMPTZ;
    v_local_start TIMESTAMP;
    v_local_service_end TIMESTAMP;
    v_local_occupied_start TIMESTAMP;
    v_local_occupied_end TIMESTAMP;
    v_local_date DATE;
    v_local_time TIME;
    v_local_service_end_time TIME;
    v_local_occupied_start_time TIME;
    v_local_occupied_end_time TIME;
    v_day_of_week SMALLINT;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Caller must be authenticated.');
    END IF;

    -- 2. Verify caller membership in business
    IF NOT public.is_business_member(p_business_id, v_user_id) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_ACCESS_DENIED', 'message', 'Access denied to this business workspace.');
    END IF;

    -- 3. Load appointment
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment not found.');
    END IF;

    -- 4. Status check: Only active (confirmed or pending) can be rescheduled
    IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Cannot reschedule an appointment that is already ' || v_appointment.status || '.'
        );
    END IF;

    -- 5. Determine target staff
    v_target_staff_id := pg_catalog.coalesce(p_new_staff_id, v_appointment.staff_id);

    -- Verify target staff exists, is active, and is not archived
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE id = v_target_staff_id AND business_id = p_business_id AND is_active = TRUE AND is_archived = FALSE
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_STAFF', 'message', 'The requested staff member is inactive or archived.');
    END IF;

    -- If staff changed, verify eligibility for the original service
    IF v_target_staff_id != v_appointment.staff_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_services
            WHERE business_id = p_business_id 
              AND staff_id = v_target_staff_id 
              AND service_id = v_appointment.service_id
        ) THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_NOT_ELIGIBLE', 'message', 'New staff member is not eligible for this service.');
        END IF;
    END IF;

    -- 6. Load Business timezone and booking policy
    SELECT timezone INTO v_business FROM public.businesses WHERE id = p_business_id;

    SELECT min_notice_hours, max_advance_days
    INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = p_business_id;

    IF FOUND THEN
        IF p_new_starts_at < (pg_catalog.now() + (pg_catalog.coalesce(v_policy.min_notice_hours, 0) * INTERVAL '1 hour')) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'OUTSIDE_BOOKING_WINDOW',
                'message', 'The rescheduled time falls within the minimum required booking notice window.'
            );
        END IF;

        IF p_new_starts_at > (pg_catalog.now() + (pg_catalog.coalesce(v_policy.max_advance_days, 60) * INTERVAL '1 day')) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'OUTSIDE_BOOKING_WINDOW',
                'message', 'The rescheduled time is beyond the maximum advance booking window.'
            );
        END IF;
    END IF;

    -- 7. Compute new intervals
    v_service_ends_at := p_new_starts_at + (v_appointment.duration_minutes_snapshot * INTERVAL '1 minute');
    v_occupied_starts_at := p_new_starts_at - (v_appointment.buffer_before_minutes_snapshot * INTERVAL '1 minute');
    v_occupied_ends_at := v_service_ends_at + (v_appointment.buffer_after_minutes_snapshot * INTERVAL '1 minute');

    -- 8. Verify business holiday, opening hours, staff shifts, breaks, and time-off
    v_local_start := p_new_starts_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_service_end := v_service_ends_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_occupied_start := v_occupied_starts_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_occupied_end := v_occupied_ends_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');

    v_local_date := v_local_start::date;
    v_local_time := v_local_start::time;
    v_local_service_end_time := v_local_service_end::time;
    v_local_occupied_start_time := v_local_occupied_start::time;
    v_local_occupied_end_time := v_local_occupied_end::time;
    v_day_of_week := pg_catalog.extract(DOW FROM v_local_start)::smallint;

    IF EXISTS (
        SELECT 1 FROM public.business_schedule_exceptions
        WHERE business_id = p_business_id AND exception_date = v_local_date AND is_closed = TRUE
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_CLOSED', 'message', 'Business is closed on target date.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.business_schedule_exceptions
        WHERE business_id = p_business_id AND exception_date = v_local_date
    ) THEN
        IF EXISTS (SELECT 1 FROM public.business_opening_hours WHERE business_id = p_business_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.business_opening_hours
                WHERE business_id = p_business_id
                  AND day_of_week = v_day_of_week
                  AND is_closed = FALSE
                  AND open_time <= v_local_time
                  AND close_time >= v_local_service_end_time
            ) THEN
                RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_CLOSED', 'message', 'Target time falls outside business opening hours.');
            END IF;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.staff_working_hours WHERE business_id = p_business_id AND staff_id = v_target_staff_id) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_working_hours
            WHERE business_id = p_business_id
              AND staff_id = v_target_staff_id
              AND day_of_week = v_day_of_week
              AND is_working = TRUE
              AND open_time <= v_local_occupied_start_time
              AND close_time >= v_local_occupied_end_time
        ) THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_UNAVAILABLE', 'message', 'Staff member is not scheduled to work during target timeslot.');
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.staff_breaks
        WHERE business_id = p_business_id
          AND staff_id = v_target_staff_id
          AND day_of_week = v_day_of_week
          AND v_local_occupied_start_time < end_time
          AND start_time < v_local_occupied_end_time
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_UNAVAILABLE', 'message', 'Target timeslot overlaps with a scheduled staff break.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.staff_time_off
        WHERE business_id = p_business_id AND staff_id = v_target_staff_id
          AND start_date <= v_local_date AND end_date >= v_local_date
          AND (is_full_day = TRUE OR (v_local_occupied_start_time < end_time AND start_time < v_local_occupied_end_time))
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_UNAVAILABLE', 'message', 'Staff member is on leave on target date/time.');
    END IF;

    -- 9. Atomic Update with Exclusion Constraint Protection
    -- If target slot is taken, exclusion_violation triggers rollback and original booking is unharmed
    BEGIN
        UPDATE public.appointments
        SET staff_id = v_target_staff_id,
            starts_at = p_new_starts_at,
            service_ends_at = v_service_ends_at,
            occupied_starts_at = v_occupied_starts_at,
            occupied_ends_at = v_occupied_ends_at,
            notes = CASE 
                WHEN p_reason IS NOT NULL THEN pg_catalog.coalesce(notes || ' | ', '') || 'Rescheduled: ' || p_reason
                ELSE notes 
            END,
            updated_at = pg_catalog.now()
        WHERE id = p_appointment_id AND business_id = p_business_id
        RETURNING * INTO v_appointment;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'data', pg_catalog.to_jsonb(v_appointment)
        );

    EXCEPTION
        WHEN exclusion_violation THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'SLOT_TAKEN',
                'message', 'The requested new slot is already booked for this staff member.'
            );
    END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reschedule_appointment_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment_atomic TO authenticated;

-- C. CANCEL APPOINTMENT ATOMIC
CREATE OR REPLACE FUNCTION public.cancel_appointment_atomic(
    p_business_id UUID,
    p_appointment_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_appointment RECORD;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Caller must be authenticated.');
    END IF;

    -- 2. Verify caller membership in business
    IF NOT public.is_business_member(p_business_id, v_user_id) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_ACCESS_DENIED', 'message', 'Access denied to this business workspace.');
    END IF;

    -- 3. Load appointment
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment not found.');
    END IF;

    -- 4. State checks
    IF v_appointment.status = 'cancelled' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'is_already_cancelled', true,
            'data', pg_catalog.to_jsonb(v_appointment)
        );
    END IF;

    IF v_appointment.status = 'completed' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Cannot cancel an appointment that is already marked completed.'
        );
    END IF;

    -- 5. Transition to cancelled atomically
    -- Transitioning status to 'cancelled' excludes this row from the double-booking exclusion constraint,
    -- immediately freeing future staff capacity without deleting historical data.
    UPDATE public.appointments
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_appointment_id AND business_id = p_business_id
    RETURNING * INTO v_appointment;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'is_already_cancelled', false,
        'data', pg_catalog.to_jsonb(v_appointment)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_appointment_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_atomic TO authenticated;

-- D. UPDATE APPOINTMENT STATUS ATOMIC
CREATE OR REPLACE FUNCTION public.update_appointment_status_atomic(
    p_business_id UUID,
    p_appointment_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_appointment RECORD;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Caller must be authenticated.');
    END IF;

    -- 2. Verify caller membership in business
    IF NOT public.is_business_member(p_business_id, v_user_id) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_ACCESS_DENIED', 'message', 'Access denied to this business workspace.');
    END IF;

    -- 3. Load appointment
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment not found.');
    END IF;

    -- If transitioning to cancelled, route to atomic cancellation
    IF p_new_status = 'cancelled' THEN
        RETURN public.cancel_appointment_atomic(p_business_id, p_appointment_id, p_reason);
    END IF;

    -- 4. Validate permitted transitions
    IF v_appointment.status IN ('completed', 'cancelled', 'no_show') AND v_appointment.status != p_new_status THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Cannot transition appointment from terminal state ' || v_appointment.status || '.'
        );
    END IF;

    IF v_appointment.status = 'pending' AND p_new_status NOT IN ('confirmed', 'cancelled') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Invalid status transition from pending to ' || p_new_status || '.'
        );
    END IF;

    IF v_appointment.status = 'confirmed' AND p_new_status NOT IN ('completed', 'cancelled', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Invalid status transition from confirmed to ' || p_new_status || '.'
        );
    END IF;

    -- 5. Commit status update
    UPDATE public.appointments
    SET status = p_new_status,
        updated_at = pg_catalog.now()
    WHERE id = p_appointment_id AND business_id = p_business_id
    RETURNING * INTO v_appointment;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'data', pg_catalog.to_jsonb(v_appointment)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_appointment_status_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_status_atomic TO authenticated;
