-- ==============================================================================
-- Migration: 20261020000005_add_update_appointment_status_atomic.sql
-- Description: Hardened update_appointment_status_atomic RPC with role-based
--              access control (Owner/Manager vs Assigned Staff), complete
--              lifecycle state-machine transitions, idempotency, search_path = '',
--              and PostgREST schema cache reload.
-- Phase: BookPilot AI Phase 1E-A
-- Security: SECURITY DEFINER, SET search_path = '', role-verified auth.uid().
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

-- Revoke from PUBLIC and anon; grant exclusively to authenticated
REVOKE EXECUTE ON FUNCTION public.update_appointment_status_atomic(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_status_atomic(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
