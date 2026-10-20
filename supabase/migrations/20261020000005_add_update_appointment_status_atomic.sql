-- ==============================================================================
-- Migration: 20261020000005_add_update_appointment_status_atomic.sql
-- Description: Incremental patch adding update_appointment_status_atomic RPC
--              with strict status state-machine transitions, authorization checks,
--              search_path = '', and PostgREST schema cache reload.
-- Phase: BookPilot AI Phase 1E-A
-- Security: SECURITY DEFINER, SET search_path = '', direct caller auth.uid() check.
-- ==============================================================================

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
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 
            'code', 'UNAUTHORIZED', 
            'message', 'Caller must be authenticated.'
        );
    END IF;

    -- 2. Verify caller membership in business
    IF NOT public.is_business_member(p_business_id, v_user_id) THEN
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

    -- 4. Route cancellation to dedicated cancel RPC to release GiST slot
    IF p_new_status = 'cancelled' THEN
        RETURN public.cancel_appointment_atomic(p_business_id, p_appointment_id, p_reason);
    END IF;

    -- 5. Validate permitted transitions
    -- Terminal states cannot transition to other states
    IF v_appointment.status IN ('completed', 'cancelled', 'no_show') AND v_appointment.status != p_new_status THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Cannot transition appointment from terminal state ' || v_appointment.status || '.'
        );
    END IF;

    -- Pending can only transition to confirmed or cancelled
    IF v_appointment.status = 'pending' AND p_new_status NOT IN ('confirmed', 'cancelled') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Invalid status transition from pending to ' || p_new_status || '.'
        );
    END IF;

    -- Confirmed can transition to completed, cancelled, or no_show
    IF v_appointment.status = 'confirmed' AND p_new_status NOT IN ('completed', 'cancelled', 'no_show') THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS_TRANSITION',
            'message', 'Invalid status transition from confirmed to ' || p_new_status || '.'
        );
    END IF;

    -- 6. Commit status update
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

-- Explicitly revoke from PUBLIC and anon; grant exclusively to authenticated
REVOKE EXECUTE ON FUNCTION public.update_appointment_status_atomic(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_status_atomic(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
