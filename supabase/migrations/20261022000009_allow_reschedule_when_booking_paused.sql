-- ==============================================================================
-- Migration: 20261022000009_allow_reschedule_when_booking_paused.sql
-- Description: Allow existing confirmed appointments to be rescheduled via valid
--              management token even when new public online bookings are paused.
--              Maintains all policies (notice hours, advance days, working hours,
--              breaks, time off, and exclusion constraints).
-- Phase: BookPilot AI Phase 1F Remediation (1F-004)
-- Security: SECURITY DEFINER, SET search_path = '', EXECUTE granted strictly to service_role.
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

    -- Check Policies: Enforce notice and advance horizon rules.
    -- Existing confirmed bookings with a valid link remain eligible to reschedule even when
    -- new online bookings are paused on the public wizard.
    SELECT min_notice_hours, max_advance_days INTO v_policy
    FROM public.business_booking_policies
    WHERE business_id = v_appointment.business_id;

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
