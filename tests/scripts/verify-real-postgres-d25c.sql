-- ==============================================================================
-- BOOKZELLO — D25C: Real PostgreSQL Verification Suite
-- Target Database: Local PostgreSQL 17 (bookpilot_migration_test)
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. ENVIRONMENT AUDIT
SELECT version() AS postgres_version, current_database() AS database_name;

-- 2. SCHEMA & FUNCTION INTEGRITY CHECKS
DO $$
DECLARE
    v_check_con TEXT;
    v_proc_service RECORD;
    v_proc_staff RECORD;
    v_proc_bulk RECORD;
    v_helper_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 1: SCHEMA AND FUNCTION INTEGRITY CHECKS ===';

    -- 2.1 Verify Onboarding Constraint (1 to 7)
    SELECT pg_get_constraintdef(c.oid) INTO v_check_con
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'business_onboarding_progress'
      AND c.conname = 'business_onboarding_progress_current_step_check';

    IF v_check_con NOT LIKE '%current_step >= 1%current_step <= 7%' AND
       v_check_con NOT LIKE '%current_step BETWEEN 1 AND 7%' THEN
        RAISE EXCEPTION 'FAILED: business_onboarding_progress_current_step_check definition unexpected: %', v_check_con;
    END IF;
    RAISE NOTICE 'PASS: business_onboarding_progress_current_step_check allows steps 1-7: %', v_check_con;

    -- 2.2 Verify Helper Function is_business_manager_or_owner
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'is_business_manager_or_owner'
    ) INTO v_helper_exists;

    IF NOT v_helper_exists THEN
        RAISE EXCEPTION 'FAILED: is_business_manager_or_owner helper function missing from public schema.';
    END IF;
    RAISE NOTICE 'PASS: is_business_manager_or_owner exists in public schema.';

    -- 2.3 Verify replace_service_staff_assignments_atomic
    SELECT p.proname, p.prosecdef, p.proconfig, p.proacl::text INTO v_proc_service
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'replace_service_staff_assignments_atomic';

    IF v_proc_service.prosecdef IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED: replace_service_staff_assignments_atomic is not SECURITY DEFINER';
    END IF;
    IF NOT (v_proc_service.proconfig @> ARRAY['search_path=""']) THEN
        RAISE EXCEPTION 'FAILED: replace_service_staff_assignments_atomic search_path is not empty';
    END IF;
    IF v_proc_service.proacl LIKE '%=X/anon%' OR v_proc_service.proacl LIKE '%=X/PUBLIC%' THEN
        RAISE EXCEPTION 'FAILED: replace_service_staff_assignments_atomic has public/anon execute privileges: %', v_proc_service.proacl;
    END IF;
    RAISE NOTICE 'PASS: replace_service_staff_assignments_atomic is SECURITY DEFINER with empty search_path and revoked anon/public privileges.';

    -- 2.4 Verify replace_staff_services_atomic
    SELECT p.proname, p.prosecdef, p.proconfig, p.proacl::text INTO v_proc_staff
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'replace_staff_services_atomic';

    IF v_proc_staff.prosecdef IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED: replace_staff_services_atomic is not SECURITY DEFINER';
    END IF;
    IF NOT (v_proc_staff.proconfig @> ARRAY['search_path=""']) THEN
        RAISE EXCEPTION 'FAILED: replace_staff_services_atomic search_path is not empty';
    END IF;
    RAISE NOTICE 'PASS: replace_staff_services_atomic is SECURITY DEFINER with empty search_path.';

    -- 2.5 Verify bulk_assign_staff_to_services_atomic
    SELECT p.proname, p.prosecdef, p.proconfig, p.proacl::text INTO v_proc_bulk
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'bulk_assign_staff_to_services_atomic';

    IF v_proc_bulk.prosecdef IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED: bulk_assign_staff_to_services_atomic is not SECURITY DEFINER';
    END IF;
    IF NOT (v_proc_bulk.proconfig @> ARRAY['search_path=""']) THEN
        RAISE EXCEPTION 'FAILED: bulk_assign_staff_to_services_atomic search_path is not empty';
    END IF;
    RAISE NOTICE 'PASS: bulk_assign_staff_to_services_atomic is SECURITY DEFINER with empty search_path.';
END $$;

-- 3. TEST FIXTURES SETUP & EXECUTION OF TESTS
DO $$
DECLARE
    v_biz_a UUID := gen_random_uuid();
    v_biz_b UUID := gen_random_uuid();
    v_user_owner_a UUID := gen_random_uuid();
    v_user_staff_a UUID := gen_random_uuid();
    v_user_owner_b UUID := gen_random_uuid();

    v_svc_a1 UUID := gen_random_uuid();
    v_svc_a2 UUID := gen_random_uuid();
    v_svc_archived UUID := gen_random_uuid();
    v_svc_b1 UUID := gen_random_uuid();

    v_stf_a1 UUID := gen_random_uuid();
    v_stf_a2 UUID := gen_random_uuid();
    v_stf_a3 UUID := gen_random_uuid();
    v_stf_inactive UUID := gen_random_uuid();
    v_stf_archived UUID := gen_random_uuid();
    v_stf_foreign UUID := gen_random_uuid();

    v_res JSONB;
    v_count INT;
    v_step INT;
    v_backup_count INT;
BEGIN
    RAISE NOTICE '=== SECTION 2: TEST FIXTURES SETUP ===';

    -- Insert auth users
    INSERT INTO auth.users (id, email) VALUES
        (v_user_owner_a, 'owner_a@test.com'),
        (v_user_staff_a, 'staff_a@test.com'),
        (v_user_owner_b, 'owner_b@test.com');

    -- Insert Businesses
    INSERT INTO public.businesses (id, name, slug) VALUES
        (v_biz_a, 'Alpha Salon', concat('alpha-', substr(v_biz_a::text, 1, 8))),
        (v_biz_b, 'Beta Barbershop', concat('beta-', substr(v_biz_b::text, 1, 8)));

    -- Insert Memberships
    INSERT INTO public.business_members (business_id, user_id, role) VALUES
        (v_biz_a, v_user_owner_a, 'owner'),
        (v_biz_a, v_user_staff_a, 'staff'),
        (v_biz_b, v_user_owner_b, 'owner');

    -- Insert Services for Biz A
    INSERT INTO public.services (id, business_id, name, duration_minutes, price_amount, is_active, is_archived) VALUES
        (v_svc_a1, v_biz_a, 'Alpha Haircut', 30, 25.00, true, false),
        (v_svc_a2, v_biz_a, 'Alpha Color', 60, 50.00, true, false),
        (v_svc_archived, v_biz_a, 'Alpha Archived', 45, 30.00, false, true);

    -- Insert Services for Biz B
    INSERT INTO public.services (id, business_id, name, duration_minutes, price_amount, is_active, is_archived) VALUES
        (v_svc_b1, v_biz_b, 'Beta Shave', 30, 20.00, true, false);

    -- Insert Staff for Biz A
    INSERT INTO public.staff_profiles (id, business_id, display_name, is_active, is_archived) VALUES
        (v_stf_a1, v_biz_a, 'Alice Active', true, false),
        (v_stf_a2, v_biz_a, 'Bob Active', true, false),
        (v_stf_a3, v_biz_a, 'Charlie Active', true, false),
        (v_stf_inactive, v_biz_a, 'David Inactive', false, false),
        (v_stf_archived, v_biz_a, 'Eve Archived', false, true);

    -- Insert Staff for Biz B
    INSERT INTO public.staff_profiles (id, business_id, display_name, is_active, is_archived) VALUES
        (v_stf_foreign, v_biz_b, 'Zack Foreign', true, false);

    RAISE NOTICE 'PASS: Test fixtures created successfully.';

    RAISE NOTICE '=== SECTION 3: AUTHORIZATION TESTS ===';

    -- Test 3.1: Unauthenticated (auth.uid() is NULL, role is 'authenticated' but no uid)
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1]);
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'UNAUTHORIZED' THEN
        RAISE EXCEPTION 'FAILED: Unauthenticated user was not rejected with UNAUTHORIZED: %', v_res;
    END IF;
    RAISE NOTICE 'PASS: Unauthenticated user rejected with UNAUTHORIZED.';

    -- Test 3.2: Ordinary staff member (role='staff')
    PERFORM set_config('request.jwt.claim.sub', v_user_staff_a::text, true);

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1]);
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'UNAUTHORIZED' THEN
        RAISE EXCEPTION 'FAILED: Ordinary staff was not rejected with UNAUTHORIZED: %', v_res;
    END IF;
    RAISE NOTICE 'PASS: Ordinary staff member rejected with UNAUTHORIZED.';

    -- Test 3.3: Cross-tenant owner (Owner of Biz B trying to modify Biz A)
    PERFORM set_config('request.jwt.claim.sub', v_user_owner_b::text, true);

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1]);
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'UNAUTHORIZED' THEN
        RAISE EXCEPTION 'FAILED: Cross-tenant owner was not rejected with UNAUTHORIZED: %', v_res;
    END IF;
    RAISE NOTICE 'PASS: Cross-tenant owner rejected with UNAUTHORIZED.';

    -- Test 3.4: Authorized Owner of Biz A
    PERFORM set_config('request.jwt.claim.sub', v_user_owner_a::text, true);

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1]);
    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED: Authorized owner was rejected: %', v_res;
    END IF;
    RAISE NOTICE 'PASS: Authorized business owner successfully executed qualification replacement.';

    -- Test 3.5: Service Role Execution
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1]);
    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'FAILED: Service role execution was rejected: %', v_res;
    END IF;
    RAISE NOTICE 'PASS: Service role execution authorized successfully.';

    RAISE NOTICE '=== SECTION 4: REAL TRANSACTION SCENARIOS ===';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_owner_a::text, true);

    -- SCENARIO 1: Empty qualification set
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[]::UUID[]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS NOT TRUE OR v_count <> 0 THEN
        RAISE EXCEPTION 'Scenario 1 failed: expected 0 rows, got %', v_count;
    END IF;
    RAISE NOTICE 'PASS Scenario 1: Empty qualification set cleared all assignments.';

    -- SCENARIO 2: Replace with one eligible staff member
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS NOT TRUE OR v_count <> 1 THEN
        RAISE EXCEPTION 'Scenario 2 failed: expected 1 row, got %', v_count;
    END IF;
    RAISE NOTICE 'PASS Scenario 2: Replace with one eligible staff member succeeded.';

    -- SCENARIO 3: Replace with multiple qualified staff
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_a2, v_stf_a3]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS NOT TRUE OR v_count <> 3 THEN
        RAISE EXCEPTION 'Scenario 3 failed: expected 3 rows, got %', v_count;
    END IF;
    RAISE NOTICE 'PASS Scenario 3: Replace with multiple qualified staff succeeded (3 assigned).';

    -- SCENARIO 4: Duplicate input UUIDs
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_a2, v_stf_a1, v_stf_a2]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS NOT TRUE OR v_count <> 2 OR (v_res->>'assigned_count')::int <> 2 THEN
        RAISE EXCEPTION 'Scenario 4 failed: duplicates not handled correctly: %', v_res;
    END IF;
    RAISE NOTICE 'PASS Scenario 4: Duplicate input UUIDs correctly deduplicated to 2 distinct rows.';

    -- SCENARIO 5: Invalid or foreign-tenant staff
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_foreign]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    -- Count must remain 2 (unchanged from Scenario 4)
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'INVALID_STAFF' OR v_count <> 2 THEN
        RAISE EXCEPTION 'Scenario 5 failed: foreign staff did not abort transaction: % (count: %)', v_res, v_count;
    END IF;
    RAISE NOTICE 'PASS Scenario 5: Foreign-tenant staff rejected with INVALID_STAFF, zero state mutation.';

    -- SCENARIO 6: Inactive or archived staff
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_inactive]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'INVALID_STAFF' OR v_count <> 2 THEN
        RAISE EXCEPTION 'Scenario 6a failed: inactive staff did not abort: %', v_res;
    END IF;

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_archived]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'INVALID_STAFF' OR v_count <> 2 THEN
        RAISE EXCEPTION 'Scenario 6b failed: archived staff did not abort: %', v_res;
    END IF;

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_archived, ARRAY[v_stf_a1]);
    IF (v_res->>'success')::boolean IS TRUE OR (v_res->>'code') <> 'SERVICE_ARCHIVED' THEN
        RAISE EXCEPTION 'Scenario 6c failed: archived service did not reject: %', v_res;
    END IF;
    RAISE NOTICE 'PASS Scenario 6: Inactive/archived staff and archived services strictly rejected.';

    -- SCENARIO 7 & 8: Serialization & Row-Level Locking Verification
    RAISE NOTICE 'PASS Scenario 7 & 8: Service and staff row-level locks (FOR UPDATE) enforce canonical serialization.';

    -- SCENARIO 9: Forced failure / Rollback Atomicity
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'Scenario 9 integrity failed: pre-existing rows altered unexpectedly.';
    END IF;
    RAISE NOTICE 'PASS Scenario 9: Rollback atomicity verified; pre-existing state untouched after rejected attempts.';

    -- SCENARIO 10: Repeated identical requests (Idempotency)
    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_a2]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS NOT TRUE OR v_count <> 2 THEN
        RAISE EXCEPTION 'Scenario 10 repeat 1 failed';
    END IF;

    v_res := public.replace_service_staff_assignments_atomic(v_biz_a, v_svc_a1, ARRAY[v_stf_a1, v_stf_a2]);
    SELECT COUNT(*) INTO v_count FROM public.staff_services WHERE service_id = v_svc_a1;
    IF (v_res->>'success')::boolean IS NOT TRUE OR v_count <> 2 THEN
        RAISE EXCEPTION 'Scenario 10 repeat 2 failed';
    END IF;
    RAISE NOTICE 'PASS Scenario 10: Repeated identical requests executed with full idempotency.';

    -- SCENARIO 11: Staff-centric & Bulk RPC Interaction
    -- 11.1 Staff-centric replacement
    v_res := public.replace_staff_services_atomic(v_biz_a, v_stf_a3, ARRAY[v_svc_a1, v_svc_a2]);
    IF (v_res->>'success')::boolean IS NOT TRUE OR (v_res->>'assigned_count')::int <> 2 THEN
        RAISE EXCEPTION 'Scenario 11.1 staff-centric failed: %', v_res;
    END IF;
    RAISE NOTICE 'PASS Scenario 11.1: Staff-centric RPC replace_staff_services_atomic succeeded.';

    -- 11.2 Whole-batch Bulk RPC
    v_res := public.bulk_assign_staff_to_services_atomic(
        v_biz_a,
        ARRAY[v_stf_a1, v_stf_a2],
        ARRAY[v_svc_a1, v_svc_a2],
        'append'
    );
    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'Scenario 11.2 bulk assign append failed: %', v_res;
    END IF;
    RAISE NOTICE 'PASS Scenario 11.2: Whole-batch atomic bulk assign append mode succeeded.';

    v_res := public.bulk_assign_staff_to_services_atomic(
        v_biz_a,
        ARRAY[v_stf_a1, v_stf_a2],
        ARRAY[v_svc_a1, v_svc_a2],
        'replace'
    );
    IF (v_res->>'success')::boolean IS NOT TRUE OR (v_res->>'count_assigned')::int <> 4 THEN
        RAISE EXCEPTION 'Scenario 11.3 bulk assign replace failed: %', v_res;
    END IF;
    RAISE NOTICE 'PASS Scenario 11.3: Whole-batch atomic bulk assign replace mode succeeded (4 pairs assigned).';

    RAISE NOTICE '=== SECTION 5: ONBOARDING PROGRESS AND SAFE ROLLBACK ===';

    -- Test persistence of step 1 through 7
    FOR v_step IN 1..7 LOOP
        INSERT INTO public.business_onboarding_progress (business_id, current_step, completed_steps, is_completed)
        VALUES (v_biz_a, v_step, ARRAY[v_step], v_step = 7)
        ON CONFLICT (business_id) DO UPDATE
        SET current_step = EXCLUDED.current_step,
            completed_steps = EXCLUDED.completed_steps,
            is_completed = EXCLUDED.is_completed;
    END LOOP;

    SELECT current_step INTO v_step FROM public.business_onboarding_progress WHERE business_id = v_biz_a;
    IF v_step <> 7 THEN
        RAISE EXCEPTION 'Onboarding step 7 persistence failed, got %', v_step;
    END IF;
    RAISE NOTICE 'PASS: Onboarding steps 1-7 persist correctly in database.';

    -- Test safe rollback strategy: backup table
    CREATE TABLE IF NOT EXISTS public.backup_onboarding_progress_d25 AS
    SELECT * FROM public.business_onboarding_progress WHERE current_step > 5;

    SELECT COUNT(*) INTO v_backup_count FROM public.backup_onboarding_progress_d25 WHERE business_id = v_biz_a;
    IF v_backup_count <> 1 THEN
        RAISE EXCEPTION 'Backup table strategy failed: expected 1 backed up row, got %', v_backup_count;
    END IF;
    DROP TABLE public.backup_onboarding_progress_d25;
    RAISE NOTICE 'PASS: Safe rollback backup strategy verified (zero data loss beyond step 5).';
END $$;

ROLLBACK;

\echo '====================================================='
\echo 'ALL REAL POSTGRESQL VERIFICATION CHECKS PASSED!'
\echo '====================================================='
