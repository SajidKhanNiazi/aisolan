-- ============================================================================
-- Bookzello / BookPilot AI — WhatsApp Pilot Connection Seed (Reference Only)
-- 
-- Status: EXECUTED MANUALLY in Supabase Production SQL Editor
-- Execution Date: October 31, 2026
-- Supabase Project: nrgfwshzbsgbuvqisaak
-- Result: "Success. No rows returned"
--
-- IMPORTANT NOTICES:
-- 1. DO NOT place this file in supabase/migrations/ or execute it as an automatic migration.
-- 2. DO NOT modify supabase_migrations.schema_migrations.
-- 3. This script is idempotent, fail-closed, and non-destructive.
-- ============================================================================

-- Block B — Corrected WhatsApp Pilot Connection Seed
DO $$
DECLARE
    v_business_id UUID;
    v_conn RECORD;
BEGIN
    -- 1. Require exactly one matching pilot business
    SELECT id INTO STRICT v_business_id
    FROM public.businesses
    WHERE slug = 'bookpilot-qa-salon';

    -- 2. Insert WhatsApp connection using ON CONFLICT (phone_number_id) DO NOTHING
    -- Rely on PostgreSQL gen_random_uuid(), connected_at, and updated_at defaults
    INSERT INTO public.whatsapp_connections (
        business_id,
        phone_number_id,
        waba_id,
        business_display_number,
        provider,
        connection_status,
        ai_enabled,
        booking_enabled,
        credential_reference
    )
    VALUES (
        v_business_id,
        '1314214205118465',
        '1796731811545454',
        '+15552134504',
        'meta_cloud_api',
        'active',
        TRUE,
        FALSE,
        NULL
    )
    ON CONFLICT (phone_number_id) DO NOTHING;

    -- 3. Post-insert validation: fetch authoritative row and assert exact configuration
    SELECT * INTO v_conn
    FROM public.whatsapp_connections
    WHERE phone_number_id = '1314214205118465';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to find WhatsApp connection for phone_number_id 1314214205118465 after insert';
    END IF;

    IF v_conn.business_id IS DISTINCT FROM v_business_id THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 is owned by another tenant (% vs %)',
            v_conn.business_id, v_business_id;
    END IF;

    IF v_conn.waba_id IS DISTINCT FROM '1796731811545454' THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 has mismatching WABA ID: %',
            v_conn.waba_id;
    END IF;

    IF v_conn.provider IS DISTINCT FROM 'meta_cloud_api' THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 has mismatching provider: %',
            v_conn.provider;
    END IF;

    IF v_conn.connection_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 is not active: %',
            v_conn.connection_status;
    END IF;

    IF v_conn.ai_enabled IS NOT TRUE THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 does not have AI enabled';
    END IF;

    IF v_conn.booking_enabled IS NOT FALSE THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 must have booking_enabled = FALSE for initial pilot';
    END IF;

    IF v_conn.credential_reference IS NOT NULL THEN
        RAISE EXCEPTION 'Connection phone_number_id 1314214205118465 has unexpected credential_reference';
    END IF;

    RAISE NOTICE 'WhatsApp pilot connection successfully verified for business %, connection_id: %',
        v_business_id, v_conn.id;
END $$;
