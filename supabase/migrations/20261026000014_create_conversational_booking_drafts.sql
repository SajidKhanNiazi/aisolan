-- Migration: 20261026000014_create_conversational_booking_drafts.sql
-- Description: Creates conversational_booking_drafts table for Phase 1H-B AI Receptionist.
-- Purpose:
--   Durable, server-authoritative, multi-tenant conversational booking draft state and idempotency
--   tracking across distributed serverless instances (hosted web, embedded widget, and future channels).
-- Security & Privacy:
--   - Draft possession is verified via cryptographically random tokens and SHA-256 token_hash.
--   - Client tokens contain zero plaintext customer PII (no phone, email, or name in client token).
--   - Direct client access revoked from PUBLIC and anon.
--   - Full management granted strictly to service_role.
--   - Dashboard read access restricted to verified business owners and managers (staff cannot view in-flight draft PII).
--   - Durable idempotency uniqueness enforced per business.

CREATE TABLE IF NOT EXISTS public.conversational_booking_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'hosted_web' CHECK (channel IN ('hosted_web', 'embedded_web', 'whatsapp')),
    token_hash TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name TEXT,
    service_price_cents INTEGER,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    staff_name TEXT,
    staff_preference TEXT NOT NULL DEFAULT 'any' CHECK (staff_preference IN ('any', 'specific')),
    slot_date DATE,
    slot_start_time TIME,
    slot_starts_at TIMESTAMPTZ,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    customer_notes TEXT,
    stage TEXT NOT NULL DEFAULT 'idle' CHECK (
        stage IN (
            'idle',
            'collecting_service',
            'collecting_staff_preference',
            'collecting_datetime',
            'checking_availability',
            'collecting_customer_details',
            'awaiting_confirmation',
            'confirming',
            'confirmed',
            'slot_unavailable',
            'cancelled_draft',
            'failed'
        )
    ),
    version INTEGER NOT NULL DEFAULT 1,
    idempotency_key TEXT NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    booking_reference TEXT,
    management_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_conv_drafts_business_id
    ON public.conversational_booking_drafts(business_id);

CREATE INDEX IF NOT EXISTS idx_conv_drafts_conversation
    ON public.conversational_booking_drafts(business_id, conversation_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_drafts_token_hash
    ON public.conversational_booking_drafts(token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_drafts_business_idempotency
    ON public.conversational_booking_drafts(business_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_conv_drafts_expires_at
    ON public.conversational_booking_drafts(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversational_booking_drafts ENABLE ROW LEVEL SECURITY;

-- Deny all public access by default
REVOKE ALL ON public.conversational_booking_drafts FROM PUBLIC, anon;
GRANT ALL ON public.conversational_booking_drafts TO service_role;
GRANT SELECT ON public.conversational_booking_drafts TO authenticated;

-- Policy 1: Service role has full management
DROP POLICY IF EXISTS "Service role manages conversational booking drafts" ON public.conversational_booking_drafts;
CREATE POLICY "Service role manages conversational booking drafts"
    ON public.conversational_booking_drafts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 2: Business owners and managers view organization drafts (staff cannot view in-flight customer PII)
DROP POLICY IF EXISTS "Business members view organization drafts" ON public.conversational_booking_drafts;
DROP POLICY IF EXISTS "Business owners and managers view organization drafts" ON public.conversational_booking_drafts;
CREATE POLICY "Business owners and managers view organization drafts"
    ON public.conversational_booking_drafts
    FOR SELECT
    TO authenticated
    USING (
        public.is_business_manager_or_owner(business_id, auth.uid())
    );

-- Auto-cleanup function for expired drafts (can be called by cron worker)
CREATE OR REPLACE FUNCTION public.cleanup_expired_conversational_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.conversational_booking_drafts
    WHERE expires_at < pg_catalog.now() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_conversational_drafts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_conversational_drafts() TO service_role;

-- Safe Rollback Script:
-- DROP FUNCTION IF EXISTS public.cleanup_expired_conversational_drafts();
-- DROP TABLE IF EXISTS public.conversational_booking_drafts CASCADE;
