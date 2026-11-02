-- ==============================================================================
-- BookPilot AI / Bookzello — Migration 0016: Production-Safe Atomic Staff Qualification
-- and Seven-Step Onboarding Progress Expansion
--
-- Invariants enforced:
-- 1. Expands business_onboarding_progress.current_step check constraint to 1-7.
-- 2. replace_service_staff_assignments_atomic: Fully transactional qualification replacement
--    with parent service and child staff row-level locking (FOR UPDATE) in canonical order,
--    strict owner/manager authorization, tenant isolation, array deduplication, and zero privilege escalation.
-- 3. replace_staff_services_atomic: Companion atomic RPC for staff-centric assignment replacement
--    with canonical lock ordering (services before staff) to eliminate cross-RPC deadlocks.
-- 4. bulk_assign_staff_to_services_atomic: Whole-batch atomic RPC for multi-staff multi-service
--    assignment (append or replace) with all-or-nothing transactional guarantees.
-- 5. Inappropriate public and anonymous EXECUTE privileges revoked; restricted to authenticated and service_role.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXPAND ONBOARDING PROGRESS CURRENT_STEP CONSTRAINT (1 to 7)
-- ------------------------------------------------------------------------------
ALTER TABLE public.business_onboarding_progress
    DROP CONSTRAINT IF EXISTS business_onboarding_progress_current_step_check;

ALTER TABLE public.business_onboarding_progress
    ADD CONSTRAINT business_onboarding_progress_current_step_check 
    CHECK (current_step BETWEEN 1 AND 7);

-- ------------------------------------------------------------------------------
-- 2. ATOMIC QUALIFICATION SET REPLACEMENT RPC (SERVICE-CENTRIC)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_service_staff_assignments_atomic(
    p_business_id UUID,
    p_service_id UUID,
    p_staff_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_service RECORD;
    v_unique_staff_ids UUID[];
    v_unique_staff_count INT := 0;
    v_valid_staff_count INT := 0;
BEGIN
    -- 1. AUTHORIZATION: Only manager/owner or service_role can modify service staff assignments
    IF NOT (
        auth.role() = 'service_role' OR
        (auth.uid() IS NOT NULL AND public.is_business_manager_or_owner(p_business_id, auth.uid()))
    ) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'error', 'Caller is not authorized to manage staff qualifications for this business.'
        );
    END IF;

    -- 2. SERIALIZATION & SERVICE LOCK: Lock the parent service row FOR UPDATE first
    SELECT s.id, s.name, s.is_active, s.is_archived
    INTO v_service
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'SERVICE_NOT_FOUND',
            'error', 'Service does not exist in this business organization.'
        );
    END IF;

    IF v_service.is_archived IS TRUE THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'SERVICE_ARCHIVED',
            'error', 'Cannot assign staff to an archived service.'
        );
    END IF;

    -- 3. SANITIZATION & DEDUPLICATION: Handle NULL arrays, empty arrays, and duplicate UUIDs
    IF p_staff_ids IS NOT NULL AND pg_catalog.array_length(p_staff_ids, 1) > 0 THEN
        SELECT COALESCE(pg_catalog.array_agg(DISTINCT u.id), ARRAY[]::UUID[])
        INTO v_unique_staff_ids
        FROM pg_catalog.unnest(p_staff_ids) AS u(id)
        WHERE u.id IS NOT NULL;

        v_unique_staff_count := COALESCE(pg_catalog.array_length(v_unique_staff_ids, 1), 0);
    ELSE
        v_unique_staff_ids := ARRAY[]::UUID[];
        v_unique_staff_count := 0;
    END IF;

    -- 4. VALIDATION & LOCKING: Lock eligible staff in canonical order (id ASC)
    IF v_unique_staff_count > 0 THEN
        PERFORM sp.id
        FROM public.staff_profiles sp
        WHERE sp.id = ANY(v_unique_staff_ids)
          AND sp.business_id = p_business_id
        ORDER BY sp.id
        FOR UPDATE;

        SELECT pg_catalog.count(DISTINCT sp.id)
        INTO v_valid_staff_count
        FROM public.staff_profiles sp
        WHERE sp.id = ANY(v_unique_staff_ids)
          AND sp.business_id = p_business_id
          AND sp.is_active = TRUE
          AND sp.is_archived = FALSE;

        IF v_valid_staff_count <> v_unique_staff_count THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'INVALID_STAFF',
                'error', 'One or more selected professionals do not exist, are inactive, archived, or belong to another organization.'
            );
        END IF;
    END IF;

    -- 5. ATOMIC REPLACEMENT: Delete existing assignments and insert unique new set
    DELETE FROM public.staff_services ss
    WHERE ss.service_id = p_service_id
      AND ss.business_id = p_business_id;

    IF v_unique_staff_count > 0 THEN
        INSERT INTO public.staff_services (business_id, service_id, staff_id)
        SELECT p_business_id, p_service_id, u.staff_id
        FROM pg_catalog.unnest(v_unique_staff_ids) AS u(staff_id);
    END IF;

    -- 6. RETURN SUCCESS OUTCOME
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'business_id', p_business_id,
        'service_id', p_service_id,
        'assigned_count', v_unique_staff_count,
        'staff_ids', v_unique_staff_ids
    );
END;
$$;

-- Security hardening: revoke public/anonymous access, grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.replace_service_staff_assignments_atomic(UUID, UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_service_staff_assignments_atomic(UUID, UUID, UUID[]) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ATOMIC QUALIFICATION SET REPLACEMENT RPC (STAFF-CENTRIC)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_staff_services_atomic(
    p_business_id UUID,
    p_staff_id UUID,
    p_service_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_staff RECORD;
    v_unique_service_ids UUID[];
    v_unique_service_count INT := 0;
    v_valid_service_count INT := 0;
BEGIN
    -- 1. AUTHORIZATION
    IF NOT (
        auth.role() = 'service_role' OR
        (auth.uid() IS NOT NULL AND public.is_business_manager_or_owner(p_business_id, auth.uid()))
    ) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'error', 'Caller is not authorized to manage staff qualifications for this business.'
        );
    END IF;

    -- 2. SANITIZATION & DEDUPLICATION OF SERVICES
    IF p_service_ids IS NOT NULL AND pg_catalog.array_length(p_service_ids, 1) > 0 THEN
        SELECT COALESCE(pg_catalog.array_agg(DISTINCT u.id), ARRAY[]::UUID[])
        INTO v_unique_service_ids
        FROM pg_catalog.unnest(p_service_ids) AS u(id)
        WHERE u.id IS NOT NULL;

        v_unique_service_count := COALESCE(pg_catalog.array_length(v_unique_service_ids, 1), 0);
    ELSE
        v_unique_service_ids := ARRAY[]::UUID[];
        v_unique_service_count := 0;
    END IF;

    -- 3. CANONICAL LOCK ORDERING: Lock services FIRST in ascending id order
    -- This guarantees consistent lock acquisition order across all RPCs and eliminates cycle deadlocks.
    IF v_unique_service_count > 0 THEN
        PERFORM s.id
        FROM public.services s
        WHERE s.id = ANY(v_unique_service_ids)
          AND s.business_id = p_business_id
        ORDER BY s.id
        FOR UPDATE;
    END IF;

    -- 4. SERIALIZATION & STAFF LOCK: Lock staff SECOND
    SELECT sp.id, sp.display_name, sp.is_active, sp.is_archived
    INTO v_staff
    FROM public.staff_profiles sp
    WHERE sp.id = p_staff_id
      AND sp.business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'STAFF_NOT_FOUND',
            'error', 'Staff member does not exist in this business organization.'
        );
    END IF;

    IF v_staff.is_archived IS TRUE THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'STAFF_ARCHIVED',
            'error', 'Cannot assign services to an archived staff member.'
        );
    END IF;

    -- Inactive staff cannot be assigned services
    IF v_staff.is_active IS FALSE AND v_unique_service_count > 0 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'STAFF_INACTIVE',
            'error', pg_catalog.concat('Cannot assign services to inactive staff member "', v_staff.display_name, '". Please activate them first.')
        );
    END IF;

    -- 5. VALIDATION OF SERVICES
    IF v_unique_service_count > 0 THEN
        SELECT pg_catalog.count(DISTINCT s.id)
        INTO v_valid_service_count
        FROM public.services s
        WHERE s.id = ANY(v_unique_service_ids)
          AND s.business_id = p_business_id
          AND s.is_active = TRUE
          AND s.is_archived = FALSE;

        IF v_valid_service_count <> v_unique_service_count THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', false,
                'code', 'INVALID_SERVICE',
                'error', 'One or more selected services do not exist, are inactive, archived, or belong to another organization.'
            );
        END IF;
    END IF;

    -- 6. ATOMIC REPLACEMENT
    DELETE FROM public.staff_services ss
    WHERE ss.staff_id = p_staff_id
      AND ss.business_id = p_business_id;

    IF v_unique_service_count > 0 THEN
        INSERT INTO public.staff_services (business_id, service_id, staff_id)
        SELECT p_business_id, u.service_id, p_staff_id
        FROM pg_catalog.unnest(v_unique_service_ids) AS u(service_id);
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'business_id', p_business_id,
        'staff_id', p_staff_id,
        'assigned_count', v_unique_service_count,
        'service_ids', v_unique_service_ids
    );
END;
$$;

-- Security hardening
REVOKE ALL ON FUNCTION public.replace_staff_services_atomic(UUID, UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_staff_services_atomic(UUID, UUID, UUID[]) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC BULK ASSIGNMENT RPC (WHOLE-BATCH ATOMICITY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_assign_staff_to_services_atomic(
    p_business_id UUID,
    p_staff_ids UUID[],
    p_service_ids UUID[],
    p_mode TEXT DEFAULT 'append'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_unique_staff_ids UUID[];
    v_unique_staff_count INT := 0;
    v_valid_staff_count INT := 0;
    v_unique_service_ids UUID[];
    v_unique_service_count INT := 0;
    v_valid_service_count INT := 0;
    v_rows_assigned INT := 0;
BEGIN
    -- 1. AUTHORIZATION
    IF NOT (
        auth.role() = 'service_role' OR
        (auth.uid() IS NOT NULL AND public.is_business_manager_or_owner(p_business_id, auth.uid()))
    ) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'error', 'Caller is not authorized to manage staff qualifications for this business.'
        );
    END IF;

    -- 2. INPUT SANITIZATION & DEDUPLICATION
    IF p_staff_ids IS NOT NULL AND pg_catalog.array_length(p_staff_ids, 1) > 0 THEN
        SELECT COALESCE(pg_catalog.array_agg(DISTINCT u.id), ARRAY[]::UUID[])
        INTO v_unique_staff_ids
        FROM pg_catalog.unnest(p_staff_ids) AS u(id)
        WHERE u.id IS NOT NULL;
        v_unique_staff_count := COALESCE(pg_catalog.array_length(v_unique_staff_ids, 1), 0);
    ELSE
        v_unique_staff_ids := ARRAY[]::UUID[];
        v_unique_staff_count := 0;
    END IF;

    IF p_service_ids IS NOT NULL AND pg_catalog.array_length(p_service_ids, 1) > 0 THEN
        SELECT COALESCE(pg_catalog.array_agg(DISTINCT u.id), ARRAY[]::UUID[])
        INTO v_unique_service_ids
        FROM pg_catalog.unnest(p_service_ids) AS u(id)
        WHERE u.id IS NOT NULL;
        v_unique_service_count := COALESCE(pg_catalog.array_length(v_unique_service_ids, 1), 0);
    ELSE
        v_unique_service_ids := ARRAY[]::UUID[];
        v_unique_service_count := 0;
    END IF;

    IF v_unique_staff_count = 0 OR v_unique_service_count = 0 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'EMPTY_SELECTION',
            'error', 'Please select at least one professional and one service.'
        );
    END IF;

    -- 3. CANONICAL LOCK ORDERING (services first, staff second, ordered by id)
    PERFORM s.id
    FROM public.services s
    WHERE s.id = ANY(v_unique_service_ids)
      AND s.business_id = p_business_id
    ORDER BY s.id
    FOR UPDATE;

    PERFORM sp.id
    FROM public.staff_profiles sp
    WHERE sp.id = ANY(v_unique_staff_ids)
      AND sp.business_id = p_business_id
    ORDER BY sp.id
    FOR UPDATE;

    -- 4. VALIDATION
    SELECT pg_catalog.count(DISTINCT s.id)
    INTO v_valid_service_count
    FROM public.services s
    WHERE s.id = ANY(v_unique_service_ids)
      AND s.business_id = p_business_id
      AND s.is_active = TRUE
      AND s.is_archived = FALSE;

    IF v_valid_service_count <> v_unique_service_count THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_SERVICE',
            'error', 'One or more selected services do not exist, are inactive, archived, or belong to another organization.'
        );
    END IF;

    SELECT pg_catalog.count(DISTINCT sp.id)
    INTO v_valid_staff_count
    FROM public.staff_profiles sp
    WHERE sp.id = ANY(v_unique_staff_ids)
      AND sp.business_id = p_business_id
      AND sp.is_active = TRUE
      AND sp.is_archived = FALSE;

    IF v_valid_staff_count <> v_unique_staff_count THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'INVALID_STAFF',
            'error', 'One or more selected professionals do not exist, are inactive, archived, or belong to another organization.'
        );
    END IF;

    -- 5. ATOMIC ASSIGNMENT EXECUTION
    IF p_mode = 'replace' THEN
        -- Delete existing qualifications for all targeted staff
        DELETE FROM public.staff_services ss
        WHERE ss.business_id = p_business_id
          AND ss.staff_id = ANY(v_unique_staff_ids);

        INSERT INTO public.staff_services (business_id, service_id, staff_id)
        SELECT p_business_id, s.service_id, st.staff_id
        FROM pg_catalog.unnest(v_unique_service_ids) AS s(service_id)
        CROSS JOIN pg_catalog.unnest(v_unique_staff_ids) AS st(staff_id);

        GET DIAGNOSTICS v_rows_assigned = ROW_COUNT;
    ELSE
        -- Default: append mode (insert missing pairs without touching other assignments)
        INSERT INTO public.staff_services (business_id, service_id, staff_id)
        SELECT p_business_id, s.service_id, st.staff_id
        FROM pg_catalog.unnest(v_unique_service_ids) AS s(service_id)
        CROSS JOIN pg_catalog.unnest(v_unique_staff_ids) AS st(staff_id)
        ON CONFLICT (staff_id, service_id) DO NOTHING;

        GET DIAGNOSTICS v_rows_assigned = ROW_COUNT;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'business_id', p_business_id,
        'mode', p_mode,
        'staff_count', v_unique_staff_count,
        'service_count', v_unique_service_count,
        'count_assigned', v_rows_assigned
    );
END;
$$;

-- Security hardening
REVOKE ALL ON FUNCTION public.bulk_assign_staff_to_services_atomic(UUID, UUID[], UUID[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_assign_staff_to_services_atomic(UUID, UUID[], UUID[], TEXT) TO authenticated, service_role;

COMMIT;
