-- ==============================================================================
-- Migration: 20261020000005_add_update_appointment_status_atomic.sql
-- Description: Security patch hardening appointment mutation RPCs:
--              1. cancel_appointment_atomic: Enforce Owner/Manager vs Assigned Staff
--              2. reschedule_appointment_atomic: Enforce Owner/Manager vs Assigned Staff
--              3. update_appointment_status_atomic: Enforce Owner/Manager vs Assigned Staff,
--                 status enum validation, state-machine transitions, and idempotency.
-- Phase: BookPilot AI Phase 1E-A
-- Security: SECURITY DEFINER, SET search_path = '', strict database-level role isolation.
-- ==============================================================================

-- 1. HARDEN CANCEL_APPOINTMENT_ATOMIC
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
    v_caller_role TEXT;
    v_appointment RECORD;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'UNAUTHORIZED', 
            'message', 'Caller must be authenticated.'
        );
    END IF;

    -- 2. Verify caller membership and role in business
    SELECT role INTO v_caller_role
    FROM public.business_members
    WHERE business_id = p_business_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'BUSINESS_ACCESS_DENIED', 
            'message', 'Access denied to this business workspace.'
        );
    END IF;

    -- 3. Load appointment
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'APPOINTMENT_NOT_FOUND', 
            'message', 'Appointment not found in this business workspace.'
        );
    END IF;

    -- 4. Role Authorization: Staff may only cancel appointments assigned to their own staff profile
    IF v_caller_role = 'staff' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_profiles
            WHERE id = v_appointment.staff_id 
              AND business_id = p_business_id 
              AND user_id = v_user_id
        ) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'PERMISSION_DENIED',
                'message', 'Staff members may only cancel appointments assigned to their own staff profile.'
            );
        END IF;
    ELSIF v_caller_role NOT IN ('owner', 'manager') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'PERMISSION_DENIED',
            'message', 'Caller role does not possess appointment cancellation permissions.'
        );
    END IF;

    -- 5. State checks
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

    -- 6. Transition to cancelled atomically
    -- Excludes this row from the double-booking GiST exclusion constraint
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

REVOKE EXECUTE ON FUNCTION public.cancel_appointment_atomic(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_atomic(UUID, UUID, TEXT) TO authenticated;


-- 2. HARDEN RESCHEDULE_APPOINTMENT_ATOMIC
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
    v_caller_role TEXT;
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

    -- 2. Verify caller membership and role in business
    SELECT role INTO v_caller_role
    FROM public.business_members
    WHERE business_id = p_business_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'BUSINESS_ACCESS_DENIED', 'message', 'Access denied to this business workspace.');
    END IF;

    -- 3. Load appointment
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'code', 'APPOINTMENT_NOT_FOUND', 'message', 'Appointment not found in this business workspace.');
    END IF;

    -- 4. Role Authorization: Staff may only reschedule their own appointments and cannot reassign to other staff
    IF v_caller_role = 'staff' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_profiles
            WHERE id = v_appointment.staff_id 
              AND business_id = p_business_id 
              AND user_id = v_user_id
        ) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'PERMISSION_DENIED',
                'message', 'Staff members may only reschedule appointments assigned to their own staff profile.'
            );
        END IF;

        IF p_new_staff_id IS NOT NULL AND p_new_staff_id != v_appointment.staff_id THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'PERMISSION_DENIED',
                'message', 'Staff members cannot reassign appointments to other staff members.'
            );
        END IF;
    ELSIF v_caller_role NOT IN ('owner', 'manager') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'PERMISSION_DENIED',
            'message', 'Caller role does not possess appointment management permissions.'
        );
    END IF;

    -- 5. Status check: Only active (confirmed or pending) can be rescheduled
    IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Cannot reschedule an appointment that is already ' || v_appointment.status || '.'
        );
    END IF;

    -- 6. Determine target staff
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

    -- 7. Load Business timezone and booking policy
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

    -- 8. Compute new intervals
    v_service_ends_at := p_new_starts_at + (v_appointment.duration_minutes_snapshot * INTERVAL '1 minute');
    v_occupied_starts_at := p_new_starts_at - (v_appointment.buffer_before_minutes_snapshot * INTERVAL '1 minute');
    v_occupied_ends_at := v_service_ends_at + (v_appointment.buffer_after_minutes_snapshot * INTERVAL '1 minute');

    -- 9. Verify business holiday, opening hours, staff shifts, breaks, and time-off
    v_local_start := p_new_starts_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_service_end := v_service_ends_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_occupied_start := v_occupied_starts_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');
    v_local_occupied_end := v_occupied_ends_at AT TIME ZONE pg_catalog.coalesce(v_business.timezone, 'Europe/London');

    v_local_date := v_local_start::date;
    v_local_time := v_local_start::time;
    v_local_service_end_time := v_local_service_end::time;
    v_local_occupied_start_time := v_local_occupied_start::time;
    v_local_occupied_end_time := v_local_occupied_end::time;
    v_day_of_week := EXTRACT(DOW FROM v_local_start)::smallint;

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

    -- 10. Atomic Update with Exclusion Constraint Protection
    BEGIN
        UPDATE public.appointments
        SET staff_id = v_target_staff_id,
            starts_at = p_new_starts_at,
            service_ends_at = v_service_ends_at,
            occupied_starts_at = v_occupied_starts_at,
            occupied_ends_at = v_occupied_ends_at,
            notes = CASE 
                WHEN p_reason IS NOT NULL AND pg_catalog.char_length(pg_catalog.trim(p_reason)) > 0 
                THEN pg_catalog.coalesce(notes || ' | ', '') || 'Rescheduled: ' || pg_catalog.trim(p_reason)
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

REVOKE EXECUTE ON FUNCTION public.reschedule_appointment_atomic(UUID, UUID, TIMESTAMPTZ, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment_atomic(UUID, UUID, TIMESTAMPTZ, UUID, TEXT) TO authenticated;


-- 3. HARDEN UPDATE_APPOINTMENT_STATUS_ATOMIC
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
    v_caller_role TEXT;
    v_appointment RECORD;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'UNAUTHORIZED', 
            'message', 'Caller must be authenticated.'
        );
    END IF;

    -- 2. Validate input status value upfront
    IF p_new_status IS NULL OR p_new_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'VALIDATION_ERROR',
            'message', 'Invalid appointment status: ' || pg_catalog.coalesce(p_new_status, 'NULL') || '. Permitted statuses are: pending, confirmed, completed, cancelled, no_show.'
        );
    END IF;

    -- 3. Verify caller membership and retrieve workspace role
    SELECT role INTO v_caller_role
    FROM public.business_members
    WHERE business_id = p_business_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'BUSINESS_ACCESS_DENIED', 
            'message', 'Access denied to this business workspace.'
        );
    END IF;

    -- 4. Load appointment ensuring business workspace isolation
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'APPOINTMENT_NOT_FOUND', 
            'message', 'Appointment not found in this business workspace.'
        );
    END IF;

    -- 5. Enforce Role Permissions:
    -- - Owner / Manager: Permitted to update any appointment in the business workspace.
    -- - Staff: Permitted ONLY if the appointment is assigned to their linked staff profile.
    IF v_caller_role = 'staff' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_profiles
            WHERE id = v_appointment.staff_id 
              AND business_id = p_business_id 
              AND user_id = v_user_id
        ) THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'PERMISSION_DENIED',
                'message', 'Staff members may only update appointments assigned to their own staff profile.'
            );
        END IF;
    ELSIF v_caller_role NOT IN ('owner', 'manager') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'PERMISSION_DENIED',
            'message', 'Caller role does not possess appointment management permissions.'
        );
    END IF;

    -- 6. Check for idempotent repeat call (no-op if already in target status)
    IF v_appointment.status = p_new_status THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'is_idempotent_replay', true,
            'data', pg_catalog.to_jsonb(v_appointment)
        );
    END IF;

    -- 7. Route cancellation to dedicated cancel RPC to release GiST slot & record reason/timestamp
    IF p_new_status = 'cancelled' THEN
        RETURN public.cancel_appointment_atomic(p_business_id, p_appointment_id, p_reason);
    END IF;

    -- 8. Enforce Lifecycle State Machine Transitions
    -- A. Terminal states (completed, cancelled, no_show) cannot transition to any active state
    IF v_appointment.status IN ('completed', 'cancelled', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Cannot transition appointment from terminal state "' || v_appointment.status || '" to "' || p_new_status || '".'
        );
    END IF;

    -- B. Pending can only transition to confirmed (or cancelled, handled above)
    IF v_appointment.status = 'pending' AND p_new_status != 'confirmed' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Invalid status transition: pending appointment can only transition to confirmed or cancelled.'
        );
    END IF;

    -- C. Confirmed can transition to completed or no_show (or cancelled, handled above)
    IF v_appointment.status = 'confirmed' AND p_new_status NOT IN ('completed', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Invalid status transition: confirmed appointment cannot transition to "' || p_new_status || '".'
        );
    END IF;

    -- 9. Commit atomic status update
    UPDATE public.appointments
    SET status = p_new_status,
        notes = CASE 
            WHEN p_reason IS NOT NULL AND pg_catalog.char_length(pg_catalog.trim(p_reason)) > 0 
            THEN pg_catalog.coalesce(notes || ' | ', '') || 'Status updated to ' || p_new_status || ': ' || pg_catalog.trim(p_reason)
            ELSE notes 
        END,
        updated_at = pg_catalog.now()
    WHERE id = p_appointment_id AND business_id = p_business_id
    RETURNING * INTO v_appointment;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'is_idempotent_replay', false,
        'data', pg_catalog.to_jsonb(v_appointment)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_appointment_status_atomic(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_status_atomic(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
