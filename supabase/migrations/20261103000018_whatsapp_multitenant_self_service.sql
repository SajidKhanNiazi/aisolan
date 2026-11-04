-- ==============================================================================
-- Migration: 20261103000018_whatsapp_multitenant_self_service.sql
-- Description: Phase 1H-D28: Multi-Tenant WhatsApp Self-Service Connection Schema.
--              Adds coexistence tracking, audited OAuth state verification,
--              atomic state consumption, and anti-hijacking connection RPCs.
-- Security:
--   - Strict tenant isolation: phone_number_id cannot be claimed by multiple businesses.
--   - credential_reference remains strictly revoked from public/anon/authenticated roles.
--   - OAuth states are single-use, time-bounded, and tenant-isolated.
--   - SECURITY DEFINER functions enforce empty search_path and explicit caller role checks.
-- ==============================================================================

-- 1. ADD COEXISTENCE SUPPORT TO WHATSAPP CONNECTIONS
ALTER TABLE public.whatsapp_connections
    ADD COLUMN IF NOT EXISTS coexistence_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure an index on business_id for active connections
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_active_biz
    ON public.whatsapp_connections (business_id, connection_status);


-- 2. WHATSAPP OAUTH STATES TABLE
-- Audited, time-bounded, single-use OAuth states for Embedded Signup CSRF defense.
CREATE TABLE IF NOT EXISTS public.whatsapp_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_token TEXT NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_whatsapp_oauth_states_token UNIQUE (state_token)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_oauth_states_lookup
    ON public.whatsapp_oauth_states (state_token, expires_at)
    WHERE used_at IS NULL;

ALTER TABLE public.whatsapp_oauth_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.whatsapp_oauth_states TO service_role;

GRANT SELECT, INSERT ON TABLE public.whatsapp_oauth_states TO authenticated;

DROP POLICY IF EXISTS "whatsapp_oauth_states_select" ON public.whatsapp_oauth_states;
CREATE POLICY "whatsapp_oauth_states_select"
    ON public.whatsapp_oauth_states FOR SELECT
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()));

DROP POLICY IF EXISTS "whatsapp_oauth_states_insert" ON public.whatsapp_oauth_states;
CREATE POLICY "whatsapp_oauth_states_insert"
    ON public.whatsapp_oauth_states FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));


-- 3. ATOMIC OAUTH STATE CONSUMPTION RPC (Anti-Replay Guard)
CREATE OR REPLACE FUNCTION public.consume_whatsapp_oauth_state_atomic(
    p_state_token TEXT,
    p_business_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_state_id UUID;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_caller_uid UUID := auth.uid();
BEGIN
    -- If caller is authenticated (not service_role), require valid caller uid matching p_user_id
    IF auth.role() = 'authenticated' THEN
        IF v_caller_uid IS NULL OR v_caller_uid <> p_user_id THEN
            RAISE EXCEPTION 'Security violation: Caller % cannot consume OAuth state bound to user %',
                COALESCE(v_caller_uid::text, 'unauthenticated'), p_user_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- Atomically lock and consume the state token
    UPDATE public.whatsapp_oauth_states
    SET used_at = v_now
    WHERE state_token = p_state_token
      AND business_id = p_business_id
      AND user_id = p_user_id
      AND used_at IS NULL
      AND expires_at > v_now
    RETURNING id INTO v_state_id;

    RETURN (v_state_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_whatsapp_oauth_state_atomic(TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_whatsapp_oauth_state_atomic(TEXT, UUID, UUID) TO authenticated, service_role;


-- 4. ATOMIC WHATSAPP CONNECTION RPC
-- Safely connects or reconnects a WhatsApp Business Account to a salon tenant.
-- Enforces:
--   a) Manager or owner authorization.
--   b) Anti-hijacking: Rejects if phone_number_id is actively connected to a DIFFERENT salon.
--   c) Deactivates any previous connection for this salon atomically.
--   d) Upserts target connection with encrypted credentials.
CREATE OR REPLACE FUNCTION public.connect_whatsapp_business_atomic(
    p_business_id UUID,
    p_waba_id TEXT,
    p_phone_number_id TEXT,
    p_business_display_number TEXT DEFAULT NULL,
    p_verified_name TEXT DEFAULT NULL,
    p_encrypted_credential TEXT DEFAULT NULL,
    p_coexistence_enabled BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_existing_other_biz UUID;
    v_connection_id UUID;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_caller_uid UUID := auth.uid();
BEGIN
    -- 0. Authorization check: if authenticated caller, verify owner/manager membership
    IF auth.role() = 'authenticated' THEN
        IF v_caller_uid IS NULL OR NOT public.is_business_manager_or_owner(p_business_id, v_caller_uid) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not a manager or owner of business %', p_business_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 1. Anti-hijacking check: is this phone_number_id actively connected to another salon?
    SELECT c.business_id INTO v_existing_other_biz
    FROM public.whatsapp_connections AS c
    WHERE c.phone_number_id = p_phone_number_id
      AND c.connection_status = 'active'
      AND c.business_id <> p_business_id
    LIMIT 1;

    IF v_existing_other_biz IS NOT NULL THEN
        RAISE EXCEPTION 'Phone number ID % is actively connected to another salon organization', p_phone_number_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2. Deactivate any previous active connections for this salon
    UPDATE public.whatsapp_connections
    SET connection_status = 'disconnected',
        disconnected_at = v_now,
        updated_at = v_now
    WHERE business_id = p_business_id
      AND connection_status = 'active'
      AND phone_number_id <> p_phone_number_id;

    -- 3. Upsert the target connection
    INSERT INTO public.whatsapp_connections (
        business_id,
        provider,
        waba_id,
        phone_number_id,
        business_display_number,
        verified_name,
        connection_status,
        credential_reference,
        ai_enabled,
        booking_enabled,
        coexistence_enabled,
        connected_at,
        disconnected_at,
        updated_at
    ) VALUES (
        p_business_id,
        'meta_cloud_api',
        p_waba_id,
        p_phone_number_id,
        p_business_display_number,
        p_verified_name,
        'active',
        p_encrypted_credential,
        TRUE,
        FALSE, -- Booking writes remain disabled by default (WHATSAPP_BOOKING_WRITES_ENABLED=false)
        p_coexistence_enabled,
        v_now,
        NULL,
        v_now
    )
    ON CONFLICT (phone_number_id) DO UPDATE
    SET business_id = EXCLUDED.business_id,
        waba_id = EXCLUDED.waba_id,
        business_display_number = COALESCE(EXCLUDED.business_display_number, public.whatsapp_connections.business_display_number),
        verified_name = COALESCE(EXCLUDED.verified_name, public.whatsapp_connections.verified_name),
        connection_status = 'active',
        credential_reference = COALESCE(EXCLUDED.credential_reference, public.whatsapp_connections.credential_reference),
        ai_enabled = TRUE,
        coexistence_enabled = EXCLUDED.coexistence_enabled,
        connected_at = v_now,
        disconnected_at = NULL,
        last_error_code = NULL,
        updated_at = v_now
    RETURNING id INTO v_connection_id;

    RETURN v_connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.connect_whatsapp_business_atomic(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.connect_whatsapp_business_atomic(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;


-- 5. ATOMIC WHATSAPP DISCONNECT RPC
CREATE OR REPLACE FUNCTION public.disconnect_whatsapp_business_atomic(
    p_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_caller_uid UUID := auth.uid();
BEGIN
    -- 0. Authorization check: if authenticated caller, verify owner/manager membership
    IF auth.role() = 'authenticated' THEN
        IF v_caller_uid IS NULL OR NOT public.is_business_manager_or_owner(p_business_id, v_caller_uid) THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not a manager or owner of business %', p_business_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    UPDATE public.whatsapp_connections
    SET connection_status = 'disconnected',
        disconnected_at = v_now,
        credential_reference = NULL,
        updated_at = v_now
    WHERE business_id = p_business_id
      AND connection_status = 'active';

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.disconnect_whatsapp_business_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disconnect_whatsapp_business_atomic(UUID) TO authenticated, service_role;
