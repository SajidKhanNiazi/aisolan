-- ==============================================================================
-- Migration: 20261022000008_fix_public_booking_atomic_schema.sql
-- Description: Fix public booking atomic RPC column mapping (Defect 1F-003)
--              Aligns create_public_appointment_atomic, get_appointment_by_management_token,
--              cancel_appointment_by_management_token, and reschedule_appointment_by_management_token
--              with canonical schema established in migration 0004.
--              Eliminates non-existent columns (is_active on businesses, first_name/last_name on customers).
--              Uses standard SQL keywords (COALESCE, NULLIF, EXTRACT).
-- Phase: BookPilot AI Phase 1F Remediation
-- Security: SECURITY DEFINER, SET search_path = '', EXECUTE granted strictly to service_role.
-- ==============================================================================

-- ==============================================================================
-- 1. FIX: create_public_appointment_atomic
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_public_appointment_atomic(
    p_business_slug TEXT,
    p_service_id UUID,
    p_staff_id UUID DEFAULT NULL,
    p_starts_at TIMESTAMPTZ DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_token_hash TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_business RECORD;
    v_service RECORD;
    v_staff RECORD;
    v_policy RECORD;
    v_customer RECORD;
    v_appointment RECORD;
    v_candidate RECORD;
    v_chosen_staff_id UUID;
    v_service_ends_at TIMESTAMPTZ;
    v_occupied_starts_at TIMESTAMPTZ;
    v_occupied_ends_at TIMESTAMPTZ;
    v_buffer_after INTEGER := 0;
    v_local_start TIMESTAMP;
    v_local_date DATE;
    v_local_occupied_start_time TIME;
    v_local_occupied_end_time TIME;
    v_day_of_week SMALLINT;
    v_is_working BOOLEAN;
    v_created_customer_id UUID := NULL;
    v_normalized_email TEXT;
    v_normalized_phone TEXT;
    v_email_matches BOOLEAN;
    v_phone_matches BOOLEAN;
    v_email_mismatch BOOLEAN;
    v_phone_mismatch BOOLEAN;
    v_sqlstate TEXT;
    v_sqlerrm TEXT;
BEGIN
    -- 1. Input Validation
    IF p_business_slug IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_business_slug)) < 3 THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_SLUG', 'message', 'Invalid salon identifier.');
    END IF;

    IF p_service_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_SERVICE', 'message', 'Service selection is required.');
    END IF;

    IF p_starts_at IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_TIME', 'message', 'Appointment start time is required.');
    END IF;

    IF p_starts_at < pg_catalog.now() THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TIME_IN_PAST', 'message', 'Appointments cannot be scheduled in the past.');
    END IF;

    IF p_customer_name IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_customer_name)) < 2 THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_CUSTOMER_NAME', 'message', 'Please enter your full name.');
    END IF;

    v_normalized_email := NULLIF(pg_catalog.lower(pg_catalog.btrim(COALESCE(p_customer_email, ''))), '');
    v_normalized_phone := NULLIF(pg_catalog.btrim(COALESCE(p_customer_phone, '')), '');

    IF v_normalized_email IS NULL AND v_normalized_phone IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'CONTACT_REQUIRED', 'message', 'Either an email address or mobile phone number is required.');
    END IF;

    -- 2. Resolve Business by Slug (canonical public.businesses schema: id, name, slug, timezone, currency)
    SELECT id, name, slug, timezone, currency
    INTO v_business
    FROM public.businesses
    WHERE slug = pg_catalog.btrim(p_business_slug);

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'SALON_NOT_FOUND', 'message', 'Salon not found. Please verify the booking link.');
    END IF;

    -- 3. Idempotency Fast-Path Check
    IF p_idempotency_key IS NOT NULL AND pg_catalog.char_length(pg_catalog.btrim(p_idempotency_key)) > 0 THEN
        SELECT a.*, s.display_name AS staff_name, srv.name AS service_name, c.email AS customer_email, c.phone AS customer_phone
        INTO v_appointment
        FROM public.appointments a
        JOIN public.staff_profiles s ON s.id = a.staff_id
        JOIN public.services srv ON srv.id = a.service_id
        JOIN public.customers c ON c.id = a.customer_id
        WHERE a.business_id = v_business.id AND a.idempotency_key = pg_catalog.btrim(p_idempotency_key);

        IF FOUND THEN
            -- Authorize replay against identity mismatch
            v_email_matches := (v_normalized_email IS NOT NULL AND v_appointment.customer_email IS NOT NULL AND v_normalized_email = v_appointment.customer_email);
            v_phone_matches := (v_normalized_phone IS NOT NULL AND v_appointment.customer_phone IS NOT NULL AND v_normalized_phone = v_appointment.customer_phone);
            v_email_mismatch := (v_normalized_email IS NOT NULL AND v_appointment.customer_email IS NOT NULL AND v_normalized_email != v_appointment.customer_email);
            v_phone_mismatch := (v_normalized_phone IS NOT NULL AND v_appointment.customer_phone IS NOT NULL AND v_normalized_phone != v_appointment.customer_phone);

            IF v_email_mismatch OR v_phone_mismatch OR (NOT v_email_matches AND NOT v_phone_matches) THEN
                RETURN pg_catalog.jsonb_build_object(
                    'success', false,
                    'code', 'IDEMPOTENCY_CONFLICT',
                    'message', 'The provided idempotency key is already associated with an appointment for another customer.'
                );
            END IF;

            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'data', pg_catalog.jsonb_build_object(
                    'appointment_id', v_appointment.id,
                    'business_id', v_appointment.business_id,
                    'business_name', v_business.name,
                    'business_slug', v_business.slug,
                    'service_id', v_appointment.service_id,
                    'service_name', v_appointment.service_name_snapshot,
                    'staff_id', v_appointment.staff_id,
                    'staff_name', v_appointment.staff_name,
                    'starts_at', v_appointment.starts_at,
                    'service_ends_at', v_appointment.service_ends_at,
                    'price_amount', v_appointment.price_minor_snapshot,
                    'currency', v_appointment.currency_snapshot,
                    'status', v_appointment.status,
                    'booking_reference', pg_catalog.upper(pg_catalog.substr(v_appointment.id::text, 1, 8))
                )
            );
        END IF;
    END IF;

    -- 4. Check Business Booking Policies and Online Booking Toggle
    SELECT min_notice_hours, max_advance_days, online_booking_enabled
    INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = v_business.id;

    IF NOT FOUND OR NOT COALESCE(v_policy.online_booking_enabled, false) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'ONLINE_BOOKING_DISABLED',
            'message', 'Online booking is currently unavailable. Please contact the salon directly.'
        );
    END IF;

    -- Minimum Notice check
    IF FOUND AND p_starts_at < (pg_catalog.now() + (COALESCE(v_policy.min_notice_hours, 2) * INTERVAL '1 hour')) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'OUTSIDE_BOOKING_WINDOW',
            'message', 'The requested appointment falls within the minimum required booking notice window.'
        );
    END IF;

    -- Maximum Advance window check
    IF FOUND AND p_starts_at > (pg_catalog.now() + (COALESCE(v_policy.max_advance_days, 60) * INTERVAL '1 day')) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'OUTSIDE_BOOKING_WINDOW',
            'message', 'The requested appointment is beyond the maximum advance booking window.'
        );
    END IF;

    -- 5. Resolve Service & Timing Invariants
    SELECT id, name, price_amount, currency, duration_minutes, buffer_minutes, is_active, is_archived
    INTO v_service
    FROM public.services
    WHERE id = p_service_id AND business_id = v_business.id;

    IF NOT FOUND OR NOT v_service.is_active OR v_service.is_archived THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'SERVICE_NOT_FOUND', 'message', 'The requested service is no longer offered.');
    END IF;

    v_buffer_after := COALESCE(v_service.buffer_minutes, 0);
    v_service_ends_at := p_starts_at + (v_service.duration_minutes * INTERVAL '1 minute');
    v_occupied_starts_at := p_starts_at;
    v_occupied_ends_at := v_service_ends_at + (v_buffer_after * INTERVAL '1 minute');

    -- Timezone projection
    v_local_start := p_starts_at AT TIME ZONE COALESCE(v_business.timezone, 'Europe/London');
    v_local_date := v_local_start::date;
    v_local_occupied_start_time := (v_occupied_starts_at AT TIME ZONE COALESCE(v_business.timezone, 'Europe/London'))::time;
    v_local_occupied_end_time := (v_occupied_ends_at AT TIME ZONE COALESCE(v_business.timezone, 'Europe/London'))::time;
    v_day_of_week := EXTRACT(DOW FROM v_local_start)::SMALLINT;

    -- Check business opening hours
    IF NOT EXISTS (
        SELECT 1 FROM public.business_opening_hours
        WHERE business_id = v_business.id
          AND day_of_week = v_day_of_week
          AND is_closed = FALSE
          AND open_time <= v_local_occupied_start_time
          AND close_time >= v_local_occupied_end_time
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'SALON_CLOSED', 'message', 'The salon is closed during the requested appointment or turnaround buffer time.');
    END IF;

    -- 6. Resolve Staff: Specific Staff OR 'Any Available'
    IF p_staff_id IS NOT NULL THEN
        SELECT sp.id, sp.display_name INTO v_staff
        FROM public.staff_profiles sp
        JOIN public.staff_services ss ON ss.staff_id = sp.id AND ss.service_id = v_service.id
        WHERE sp.id = p_staff_id 
          AND sp.business_id = v_business.id 
          AND sp.is_active = TRUE 
          AND sp.is_archived = FALSE;

        IF NOT FOUND THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_NOT_ELIGIBLE', 'message', 'Selected staff member is not eligible or available for this service.');
        END IF;

        v_chosen_staff_id := v_staff.id;
    ELSE
        -- 'Any Available' logic: Find first eligible staff member with no overlapping working hours or appointments
        v_chosen_staff_id := NULL;

        FOR v_candidate IN
            SELECT sp.id, sp.display_name
            FROM public.staff_profiles sp
            JOIN public.staff_services ss ON ss.staff_id = sp.id AND ss.service_id = v_service.id
            WHERE sp.business_id = v_business.id 
              AND sp.is_active = TRUE 
              AND sp.is_archived = FALSE
            ORDER BY sp.display_order ASC, sp.display_name ASC
        LOOP
            -- Check if candidate is working this day and within shift hours
            SELECT (is_working AND open_time <= v_local_occupied_start_time AND close_time >= v_local_occupied_end_time)
            INTO v_is_working
            FROM public.staff_working_hours
            WHERE staff_id = v_candidate.id AND day_of_week = v_day_of_week;

            IF v_is_working IS TRUE THEN
                -- Check breaks
                IF NOT EXISTS (
                    SELECT 1 FROM public.staff_breaks
                    WHERE staff_id = v_candidate.id 
                      AND day_of_week = v_day_of_week
                      AND (start_time < v_local_occupied_end_time AND end_time > v_local_occupied_start_time)
                ) THEN
                    -- Check time off
                    IF NOT EXISTS (
                        SELECT 1 FROM public.staff_time_off
                        WHERE staff_id = v_candidate.id
                          AND v_local_date BETWEEN start_date AND end_date
                          AND (is_full_day = TRUE OR (start_time < v_local_occupied_end_time AND end_time > v_local_occupied_start_time))
                    ) THEN
                        -- Check appointment collision
                        IF NOT EXISTS (
                            SELECT 1 FROM public.appointments
                            WHERE staff_id = v_candidate.id
                              AND status IN ('pending', 'confirmed')
                              AND (occupied_starts_at < v_occupied_ends_at AND occupied_ends_at > v_occupied_starts_at)
                        ) THEN
                            v_chosen_staff_id := v_candidate.id;
                            v_staff.display_name := v_candidate.display_name;
                            EXIT;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;

        IF v_chosen_staff_id IS NULL THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'NO_STAFF_AVAILABLE', 'message', 'No staff member is available for this slot. Please select another time.');
        END IF;
    END IF;

    -- Verify specific staff shifts, breaks, and time-off
    IF p_staff_id IS NOT NULL THEN
        SELECT (is_working AND open_time <= v_local_occupied_start_time AND close_time >= v_local_occupied_end_time)
        INTO v_is_working
        FROM public.staff_working_hours
        WHERE staff_id = v_chosen_staff_id AND day_of_week = v_day_of_week;

        IF v_is_working IS NOT TRUE THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_NOT_WORKING', 'message', 'The requested specialist is not working during this time slot.');
        END IF;

        -- Check break collision
        IF EXISTS (
            SELECT 1 FROM public.staff_breaks
            WHERE staff_id = v_chosen_staff_id 
              AND day_of_week = v_day_of_week
              AND (start_time < v_local_occupied_end_time AND end_time > v_local_occupied_start_time)
        ) THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_ON_BREAK', 'message', 'The requested slot overlaps with a staff break.');
        END IF;

        -- Check time-off collision
        IF EXISTS (
            SELECT 1 FROM public.staff_time_off
            WHERE staff_id = v_chosen_staff_id 
              AND v_local_date BETWEEN start_date AND end_date
              AND (is_full_day = TRUE OR (start_time < v_local_occupied_end_time AND end_time > v_local_occupied_start_time))
        ) THEN
            RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_TIME_OFF', 'message', 'Staff member is scheduled for time off on this date.');
        END IF;
    END IF;

    -- 7. Find Existing Customer (email or phone)
    IF v_normalized_email IS NOT NULL THEN
        SELECT * INTO v_customer
        FROM public.customers
        WHERE business_id = v_business.id AND lower(email) = v_normalized_email
        LIMIT 1;
    END IF;

    IF v_customer.id IS NULL AND v_normalized_phone IS NOT NULL THEN
        SELECT * INTO v_customer
        FROM public.customers
        WHERE business_id = v_business.id AND phone = v_normalized_phone
        LIMIT 1;
    END IF;

    -- 8. Protected Subtransaction: Customer Creation & Appointment Commitment
    -- Guarantees atomic rollback if slot is taken, preventing orphaned customer records.
    BEGIN
        IF v_customer.id IS NULL THEN
            -- Canonical customers table schema: (business_id, name, email, phone, notes)
            INSERT INTO public.customers (
                business_id,
                name,
                email,
                phone,
                notes
            ) VALUES (
                v_business.id,
                pg_catalog.btrim(p_customer_name),
                v_normalized_email,
                v_normalized_phone,
                'Booked via online self-service'
            )
            RETURNING * INTO v_customer;

            v_created_customer_id := v_customer.id;
        END IF;

        -- Canonical appointments table schema:
        -- (business_id, customer_id, service_id, staff_id, status, starts_at, service_ends_at,
        --  occupied_starts_at, occupied_ends_at, duration_minutes_snapshot, buffer_before_minutes_snapshot,
        --  buffer_after_minutes_snapshot, price_minor_snapshot, currency_snapshot, service_name_snapshot,
        --  customer_name_snapshot, timezone_snapshot, notes, idempotency_key, created_by)
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
            v_business.id,
            v_customer.id,
            v_service.id,
            v_chosen_staff_id,
            'confirmed',
            p_starts_at,
            v_service_ends_at,
            v_occupied_starts_at,
            v_occupied_ends_at,
            v_service.duration_minutes,
            0,
            v_buffer_after,
            v_service.price_amount,
            COALESCE(v_service.currency, 'GBP'),
            v_service.name,
            pg_catalog.btrim(p_customer_name),
            COALESCE(v_business.timezone, 'Europe/London'),
            p_customer_notes,
            NULLIF(pg_catalog.btrim(COALESCE(p_idempotency_key, '')), ''),
            NULL
        )
        RETURNING * INTO v_appointment;

        -- 9. Insert Management Token if provided (inside protected subtransaction)
        IF p_token_hash IS NOT NULL AND pg_catalog.char_length(pg_catalog.btrim(p_token_hash)) = 64 THEN
            INSERT INTO public.appointment_management_tokens (
                appointment_id,
                business_id,
                token_hash,
                expires_at
            ) VALUES (
                v_appointment.id,
                v_business.id,
                pg_catalog.btrim(p_token_hash),
                COALESCE(p_token_expires_at, pg_catalog.now() + INTERVAL '90 days')
            );
        END IF;

    EXCEPTION
        WHEN exclusion_violation THEN
            -- Clean up customer record created during this failed attempt
            IF v_created_customer_id IS NOT NULL THEN
                DELETE FROM public.customers WHERE id = v_created_customer_id;
            END IF;
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'SLOT_TAKEN',
                'message', 'The requested appointment slot was just taken by another booking. Please choose another time.'
            );
        WHEN unique_violation THEN
            IF p_idempotency_key IS NOT NULL THEN
                SELECT a.*, s.display_name AS staff_name, srv.name AS service_name, c.email AS customer_email, c.phone AS customer_phone
                INTO v_appointment
                FROM public.appointments a
                JOIN public.staff_profiles s ON s.id = a.staff_id
                JOIN public.services srv ON srv.id = a.service_id
                JOIN public.customers c ON c.id = a.customer_id
                WHERE a.business_id = v_business.id AND a.idempotency_key = pg_catalog.btrim(p_idempotency_key);

                IF FOUND THEN
                    IF v_created_customer_id IS NOT NULL AND v_created_customer_id != v_appointment.customer_id THEN
                        DELETE FROM public.customers WHERE id = v_created_customer_id;
                    END IF;

                    -- Harden idempotency replay authorization against identity mismatch
                    v_email_matches := (v_normalized_email IS NOT NULL AND v_appointment.customer_email IS NOT NULL AND v_normalized_email = v_appointment.customer_email);
                    v_phone_matches := (v_normalized_phone IS NOT NULL AND v_appointment.customer_phone IS NOT NULL AND v_normalized_phone = v_appointment.customer_phone);
                    v_email_mismatch := (v_normalized_email IS NOT NULL AND v_appointment.customer_email IS NOT NULL AND v_normalized_email != v_appointment.customer_email);
                    v_phone_mismatch := (v_normalized_phone IS NOT NULL AND v_appointment.customer_phone IS NOT NULL AND v_normalized_phone != v_appointment.customer_phone);

                    IF v_email_mismatch OR v_phone_mismatch OR (NOT v_email_matches AND NOT v_phone_matches) THEN
                        RETURN pg_catalog.jsonb_build_object(
                            'success', false,
                            'code', 'IDEMPOTENCY_CONFLICT',
                            'message', 'The provided idempotency key is already associated with an appointment for another customer.'
                        );
                    END IF;

                    RETURN pg_catalog.jsonb_build_object(
                        'success', true,
                        'is_idempotent_replay', true,
                        'data', pg_catalog.jsonb_build_object(
                            'appointment_id', v_appointment.id,
                            'business_id', v_appointment.business_id,
                            'service_id', v_appointment.service_id,
                            'service_name', v_appointment.service_name_snapshot,
                            'staff_id', v_appointment.staff_id,
                            'staff_name', v_appointment.staff_name,
                            'starts_at', v_appointment.starts_at,
                            'service_ends_at', v_appointment.service_ends_at,
                            'price_amount', v_appointment.price_minor_snapshot,
                            'currency', v_appointment.currency_snapshot,
                            'status', v_appointment.status,
                            'booking_reference', pg_catalog.upper(pg_catalog.substr(v_appointment.id::text, 1, 8))
                        )
                    );
                END IF;
            END IF;
            IF v_created_customer_id IS NOT NULL THEN
                DELETE FROM public.customers WHERE id = v_created_customer_id;
            END IF;
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'CONCURRENCY_CONFLICT',
                'message', 'A concurrency conflict occurred. Please retry.'
            );
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
            RAISE WARNING '[create_public_appointment_atomic] Internal database error: % (SQLSTATE %)', v_sqlerrm, v_sqlstate;
            IF v_created_customer_id IS NOT NULL THEN
                DELETE FROM public.customers WHERE id = v_created_customer_id;
            END IF;
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'UNEXPECTED_ERROR',
                'message', 'An unexpected error occurred while completing your booking. Please retry.'
            );
    END;

    -- 10. Return sanitized outcome
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'data', pg_catalog.jsonb_build_object(
            'appointment_id', v_appointment.id,
            'business_id', v_appointment.business_id,
            'business_name', v_business.name,
            'business_slug', v_business.slug,
            'service_id', v_appointment.service_id,
            'service_name', v_appointment.service_name_snapshot,
            'staff_id', v_appointment.staff_id,
            'staff_name', COALESCE(v_staff.display_name, 'Assigned Specialist'),
            'starts_at', v_appointment.starts_at,
            'service_ends_at', v_appointment.service_ends_at,
            'price_amount', v_appointment.price_minor_snapshot,
            'currency', v_appointment.currency_snapshot,
            'status', v_appointment.status,
            'booking_reference', pg_catalog.upper(pg_catalog.substr(v_appointment.id::text, 1, 8))
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_appointment_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_appointment_atomic TO service_role;


-- ==============================================================================
-- 2. FIX: get_appointment_by_management_token
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_appointment_by_management_token(
    p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_token RECORD;
    v_appointment RECORD;
    v_business RECORD;
    v_staff RECORD;
    v_policy RECORD;
    v_can_cancel BOOLEAN := false;
    v_can_reschedule BOOLEAN := false;
BEGIN
    IF p_token_hash IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_token_hash)) != 64 THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invalid management link.');
    END IF;

    SELECT * INTO v_token
    FROM public.appointment_management_tokens
    WHERE token_hash = pg_catalog.btrim(p_token_hash);

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_NOT_FOUND', 'message', 'Booking management link not found or expired.');
    END IF;

    IF v_token.is_revoked THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_REVOKED', 'message', 'This management link is no longer active.');
    END IF;

    IF v_token.expires_at < pg_catalog.now() THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_EXPIRED', 'message', 'This management link has expired.');
    END IF;

    -- Load appointment
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = v_token.appointment_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment record not found.');
    END IF;

    -- Load Business
    SELECT id, name, slug, timezone, currency, address_line1, city, phone, email
    INTO v_business
    FROM public.businesses
    WHERE id = v_appointment.business_id;

    -- Load Staff
    SELECT id, display_name INTO v_staff
    FROM public.staff_profiles
    WHERE id = v_appointment.staff_id;

    -- Load Policy
    SELECT min_notice_hours, max_advance_days, cancellation_notice_hours, cancellation_policy_text
    INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = v_appointment.business_id;

    -- Compute cancel/reschedule permissions
    IF v_appointment.status = 'confirmed' THEN
        IF v_appointment.starts_at > (pg_catalog.now() + (COALESCE(v_policy.cancellation_notice_hours, 24) * INTERVAL '1 hour')) THEN
            v_can_cancel := true;
        END IF;

        IF v_appointment.starts_at > (pg_catalog.now() + (COALESCE(v_policy.min_notice_hours, 2) * INTERVAL '1 hour')) THEN
            v_can_reschedule := true;
        END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'data', pg_catalog.jsonb_build_object(
            'appointment_id', v_appointment.id,
            'booking_reference', pg_catalog.upper(pg_catalog.substr(v_appointment.id::text, 1, 8)),
            'status', v_appointment.status,
            'starts_at', v_appointment.starts_at,
            'service_ends_at', v_appointment.service_ends_at,
            'price_amount', v_appointment.price_minor_snapshot,
            'currency', v_appointment.currency_snapshot,
            'service_name', v_appointment.service_name_snapshot,
            'service_id', v_appointment.service_id,
            'staff_name', COALESCE(v_staff.display_name, 'Specialist'),
            'staff_id', v_appointment.staff_id,
            'customer_notes', v_appointment.notes,
            'business', pg_catalog.jsonb_build_object(
                'id', v_business.id,
                'name', v_business.name,
                'slug', v_business.slug,
                'timezone', v_business.timezone,
                'currency', v_business.currency,
                'address_line1', v_business.address_line1,
                'city', v_business.city,
                'phone', v_business.phone,
                'email', v_business.email
            ),
            'policy', pg_catalog.jsonb_build_object(
                'cancellation_notice_hours', COALESCE(v_policy.cancellation_notice_hours, 24),
                'cancellation_policy_text', v_policy.cancellation_policy_text,
                'min_notice_hours', COALESCE(v_policy.min_notice_hours, 2),
                'max_advance_days', COALESCE(v_policy.max_advance_days, 60)
            ),
            'permissions', pg_catalog.jsonb_build_object(
                'can_cancel', v_can_cancel,
                'can_reschedule', v_can_reschedule
            )
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_appointment_by_management_token FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_by_management_token TO service_role;


-- ==============================================================================
-- 3. FIX: cancel_appointment_by_management_token
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_appointment_by_management_token(
    p_token_hash TEXT,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_token RECORD;
    v_appointment RECORD;
    v_policy RECORD;
    v_cancellation_hours INTEGER := 24;
BEGIN
    IF p_token_hash IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_token_hash)) != 64 THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invalid management link.');
    END IF;

    SELECT * INTO v_token
    FROM public.appointment_management_tokens
    WHERE token_hash = pg_catalog.btrim(p_token_hash);

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_NOT_FOUND', 'message', 'Booking management link not found or expired.');
    END IF;

    IF v_token.is_revoked THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_REVOKED', 'message', 'This management link is no longer active.');
    END IF;

    IF v_token.expires_at < pg_catalog.now() THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_EXPIRED', 'message', 'This management link has expired.');
    END IF;

    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = v_token.appointment_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment not found.');
    END IF;

    IF v_appointment.status = 'cancelled' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'ALREADY_CANCELLED', 'message', 'This appointment has already been cancelled.');
    END IF;

    IF v_appointment.status != 'confirmed' AND v_appointment.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'message', 'Only upcoming appointments can be cancelled.');
    END IF;

    -- Verify Cancellation Notice Window
    SELECT cancellation_notice_hours INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = v_appointment.business_id;

    IF FOUND AND v_policy.cancellation_notice_hours IS NOT NULL THEN
        v_cancellation_hours := v_policy.cancellation_notice_hours;
    END IF;

    IF v_appointment.starts_at < (pg_catalog.now() + (v_cancellation_hours * INTERVAL '1 hour')) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'LATE_CANCELLATION',
            'message', 'Cancellations must be made at least ' || v_cancellation_hours || ' hours in advance. Please call the salon directly.'
        );
    END IF;

    -- Update appointment to cancelled (atomically releasing GIST exclusion constraint range)
    UPDATE public.appointments
    SET status = 'cancelled',
        cancellation_reason = COALESCE(p_cancellation_reason, 'Customer self-service cancellation'),
        cancelled_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = v_appointment.id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'message', 'Your appointment has been successfully cancelled and your time slot released.',
        'data', pg_catalog.jsonb_build_object(
            'appointment_id', v_appointment.id,
            'status', 'cancelled'
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment_by_management_token FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_management_token TO service_role;


-- ==============================================================================
-- 4. FIX: reschedule_appointment_by_management_token
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_management_token(
    p_token_hash TEXT,
    p_new_starts_at TIMESTAMPTZ,
    p_new_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_token RECORD;
    v_appointment RECORD;
    v_business RECORD;
    v_policy RECORD;
    v_service RECORD;
    v_target_staff_id UUID;
    v_staff RECORD;
    v_new_service_ends_at TIMESTAMPTZ;
    v_new_occupied_starts_at TIMESTAMPTZ;
    v_new_occupied_ends_at TIMESTAMPTZ;
    v_local_start TIMESTAMP;
    v_local_date DATE;
    v_local_occupied_start_time TIME;
    v_local_occupied_end_time TIME;
    v_day_of_week SMALLINT;
    v_is_working BOOLEAN;
BEGIN
    IF p_token_hash IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_token_hash)) != 64 THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invalid management link.');
    END IF;

    IF p_new_starts_at IS NULL THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'New appointment start time is required.');
    END IF;

    SELECT * INTO v_token
    FROM public.appointment_management_tokens
    WHERE token_hash = pg_catalog.btrim(p_token_hash);

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_NOT_FOUND', 'message', 'Booking management link not found or expired.');
    END IF;

    IF v_token.is_revoked THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_REVOKED', 'message', 'This management link is no longer active.');
    END IF;

    IF v_token.expires_at < pg_catalog.now() THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'TOKEN_EXPIRED', 'message', 'This management link has expired.');
    END IF;

    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = v_token.appointment_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment not found.');
    END IF;

    IF v_appointment.status != 'confirmed' AND v_appointment.status != 'pending' THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'message', 'Only upcoming appointments can be rescheduled.');
    END IF;

    -- Load Business
    SELECT id, timezone, currency INTO v_business
    FROM public.businesses
    WHERE id = v_appointment.business_id;

    -- Check Policies
    SELECT min_notice_hours, max_advance_days, online_booking_enabled INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = v_appointment.business_id;

    IF NOT FOUND OR NOT COALESCE(v_policy.online_booking_enabled, false) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'ONLINE_BOOKING_DISABLED', 'message', 'Online booking modifications are currently disabled.');
    END IF;

    IF p_new_starts_at < (pg_catalog.now() + (COALESCE(v_policy.min_notice_hours, 2) * INTERVAL '1 hour')) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'OUTSIDE_BOOKING_WINDOW', 'message', 'Rescheduled slot falls within the minimum notice window.');
    END IF;

    IF p_new_starts_at > (pg_catalog.now() + (COALESCE(v_policy.max_advance_days, 60) * INTERVAL '1 day')) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'OUTSIDE_BOOKING_WINDOW', 'message', 'Rescheduled slot is beyond the maximum advance booking window.');
    END IF;

    -- Load Service
    SELECT id, duration_minutes, buffer_minutes INTO v_service
    FROM public.services
    WHERE id = v_appointment.service_id;

    -- Resolve Staff
    v_target_staff_id := COALESCE(p_new_staff_id, v_appointment.staff_id);

    SELECT sp.id, sp.display_name INTO v_staff
    FROM public.staff_profiles sp
    JOIN public.staff_services ss ON ss.staff_id = sp.id AND ss.service_id = v_appointment.service_id
    WHERE sp.id = v_target_staff_id AND sp.business_id = v_appointment.business_id AND sp.is_active = TRUE AND sp.is_archived = FALSE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_NOT_ELIGIBLE', 'message', 'Selected specialist is not eligible for this service.');
    END IF;

    v_new_service_ends_at := p_new_starts_at + (v_service.duration_minutes * INTERVAL '1 minute');
    v_new_occupied_starts_at := p_new_starts_at;
    v_new_occupied_ends_at := v_new_service_ends_at + (COALESCE(v_service.buffer_minutes, 0) * INTERVAL '1 minute');

    v_local_start := p_new_starts_at AT TIME ZONE COALESCE(v_business.timezone, 'Europe/London');
    v_local_date := v_local_start::date;
    v_local_occupied_start_time := (v_new_occupied_starts_at AT TIME ZONE COALESCE(v_business.timezone, 'Europe/London'))::time;
    v_local_occupied_end_time := (v_new_occupied_ends_at AT TIME ZONE COALESCE(v_business.timezone, 'Europe/London'))::time;
    v_day_of_week := EXTRACT(DOW FROM v_local_start)::SMALLINT;

    -- Check Staff Working Hours
    SELECT (is_working AND open_time <= v_local_occupied_start_time AND close_time >= v_local_occupied_end_time)
    INTO v_is_working
    FROM public.staff_working_hours
    WHERE staff_id = v_target_staff_id AND day_of_week = v_day_of_week;

    IF v_is_working IS NOT TRUE THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_NOT_WORKING', 'message', 'Specialist is not working during this time slot.');
    END IF;

    -- Check Staff Break
    IF EXISTS (
        SELECT 1 FROM public.staff_breaks
        WHERE staff_id = v_target_staff_id 
          AND day_of_week = v_day_of_week
          AND (start_time < v_local_occupied_end_time AND end_time > v_local_occupied_start_time)
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_ON_BREAK', 'message', 'The requested slot conflicts with a specialist break.');
    END IF;

    -- Check Staff Time Off
    IF EXISTS (
        SELECT 1 FROM public.staff_time_off
        WHERE staff_id = v_target_staff_id
          AND v_local_date BETWEEN start_date AND end_date
          AND (is_full_day = TRUE OR (start_time < v_local_occupied_end_time AND end_time > v_local_occupied_start_time))
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'STAFF_TIME_OFF', 'message', 'Specialist has scheduled time off on this date.');
    END IF;

    -- Commit Reschedule with Concurrency Protection (exclusion constraint)
    BEGIN
        UPDATE public.appointments
        SET starts_at = p_new_starts_at,
            service_ends_at = v_new_service_ends_at,
            occupied_starts_at = v_new_occupied_starts_at,
            occupied_ends_at = v_new_occupied_ends_at,
            staff_id = v_target_staff_id,
            updated_at = pg_catalog.now()
        WHERE id = v_appointment.id
        RETURNING * INTO v_appointment;
    EXCEPTION
        WHEN exclusion_violation THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'SLOT_TAKEN',
                'message', 'The selected new time slot is no longer available. Please select another slot.'
            );
    END;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'message', 'Your appointment has been successfully rescheduled.',
        'data', pg_catalog.jsonb_build_object(
            'appointment_id', v_appointment.id,
            'starts_at', v_appointment.starts_at,
            'service_ends_at', v_appointment.service_ends_at,
            'staff_id', v_appointment.staff_id,
            'staff_name', v_staff.display_name,
            'status', v_appointment.status
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_appointment_by_management_token FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment_by_management_token TO service_role;
