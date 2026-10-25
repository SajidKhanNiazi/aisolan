-- ==============================================================================
-- Migration: 20261025000013_create_business_ai_settings.sql
-- Description: Hardened Business AI Receptionist settings, FAQs, and language preferences
--              for Bookzello Phase 1H-A.
-- Security Standards:
--   1. Strict least-privilege table RLS: direct table reads restricted to business members.
--   2. Anonymous table access revoked completely from anon and PUBLIC.
--   3. Owner/manager writes strictly enforced via public.is_business_manager_or_owner().
--      Ordinary staff members ('role = staff') have zero write permissions.
--   4. Hardened public RPC with SET search_path = '' and explicit grants.
--   5. Reuses existing public visibility rules (business_booking_policies.online_booking_enabled):
--      if a salon is not publicly enabled for bookings, AI is strictly disabled and zero FAQs are exposed.
--   6. Zero FAQ leakage when AI is disabled for a salon.
--   7. Self-contained trigger function for automatic updated_at timestamping.
-- ==============================================================================

-- 1. BUSINESS AI SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.business_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    ai_receptionist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_language TEXT NOT NULL DEFAULT 'en' CHECK (default_language IN ('en', 'ur', 'ur-Latn')),
    welcome_message TEXT NULL,
    faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_welcome_message_length CHECK (welcome_message IS NULL OR char_length(welcome_message) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_business_ai_settings_business_id 
    ON public.business_ai_settings (business_id);

-- 2. SELF-CONTAINED UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.trg_set_business_ai_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_ai_settings_updated_at ON public.business_ai_settings;
CREATE TRIGGER trg_business_ai_settings_updated_at
    BEFORE UPDATE ON public.business_ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_set_business_ai_settings_updated_at();

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.business_ai_settings ENABLE ROW LEVEL SECURITY;

-- Member-only read access (staff, managers, owners can view settings in dashboard)
-- Direct table SELECT is revoked from anon to prevent enumeration
CREATE POLICY "ai_settings_select_member"
    ON public.business_ai_settings FOR SELECT
    TO authenticated
    USING (
        public.is_business_member(business_id, auth.uid())
    );

-- Verified Owner/Manager ONLY for Insert, Update, and Delete
-- Uses existing public.is_business_manager_or_owner(business_id, user_id) helper
-- Staff members (role = 'staff') are strictly forbidden from modifying AI settings
CREATE POLICY "ai_settings_insert_owner_manager"
    ON public.business_ai_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_business_manager_or_owner(business_id, auth.uid())
    );

CREATE POLICY "ai_settings_update_owner_manager"
    ON public.business_ai_settings FOR UPDATE
    TO authenticated
    USING (
        public.is_business_manager_or_owner(business_id, auth.uid())
    )
    WITH CHECK (
        public.is_business_manager_or_owner(business_id, auth.uid())
    );

CREATE POLICY "ai_settings_delete_owner_manager"
    ON public.business_ai_settings FOR DELETE
    TO authenticated
    USING (
        public.is_business_manager_or_owner(business_id, auth.uid())
    );

-- Strict table privileges: anon has zero direct table access
REVOKE ALL ON TABLE public.business_ai_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_ai_settings TO authenticated;
GRANT ALL ON TABLE public.business_ai_settings TO service_role;

-- 4. HARDENED PUBLIC RPC FOR CUSTOMER-FACING CHAT WIDGET
-- Least-privilege function: returns only sanitized public fields for active businesses.
-- Reuses existing Bookzello visibility rule (business_booking_policies.online_booking_enabled).
-- Suppresses FAQs and custom greeting when AI is disabled or when online booking is unavailable.
CREATE OR REPLACE FUNCTION public.get_public_ai_settings_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_business RECORD;
    v_policy RECORD;
    v_settings RECORD;
    v_enabled BOOLEAN;
BEGIN
    -- Validate input parameter
    IF p_slug IS NULL OR pg_catalog.char_length(pg_catalog.btrim(p_slug)) = 0 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'VALIDATION_ERROR',
            'message', 'Salon slug is required.'
        );
    END IF;

    -- Look up business by slug
    SELECT b.id, b.name, b.slug
    INTO v_business
    FROM public.businesses b
    WHERE b.slug = pg_catalog.lower(pg_catalog.btrim(p_slug));

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'SALON_NOT_FOUND',
            'message', 'Salon not found.'
        );
    END IF;

    -- Enforce existing Bookzello public visibility rule:
    -- A salon is only publicly accessible if its business_booking_policies has online_booking_enabled = TRUE.
    SELECT p.online_booking_enabled
    INTO v_policy
    FROM public.business_booking_policies p
    WHERE p.business_id = v_business.id;

    -- If booking is disabled or policy not found, the salon is not publicly accessible.
    -- Immediately return disabled AI and suppress all FAQs and custom messages.
    IF NOT FOUND OR NOT COALESCE(v_policy.online_booking_enabled, FALSE) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'data', pg_catalog.jsonb_build_object(
                'business_id', v_business.id,
                'business_name', v_business.name,
                'business_slug', v_business.slug,
                'ai_receptionist_enabled', false,
                'default_language', 'en',
                'welcome_message', NULL,
                'faqs', '[]'::jsonb
            )
        );
    END IF;

    -- Look up AI settings for this business
    SELECT s.ai_receptionist_enabled, s.default_language, s.welcome_message, s.faqs
    INTO v_settings
    FROM public.business_ai_settings s
    WHERE s.business_id = v_business.id;

    v_enabled := COALESCE(v_settings.ai_receptionist_enabled, FALSE);

    -- If AI receptionist is disabled for this salon, suppress FAQs and custom messages completely
    IF NOT v_enabled THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'data', pg_catalog.jsonb_build_object(
                'business_id', v_business.id,
                'business_name', v_business.name,
                'business_slug', v_business.slug,
                'ai_receptionist_enabled', false,
                'default_language', 'en',
                'welcome_message', NULL,
                'faqs', '[]'::jsonb
            )
        );
    END IF;

    -- Return only authorized customer-facing configuration
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'data', pg_catalog.jsonb_build_object(
            'business_id', v_business.id,
            'business_name', v_business.name,
            'business_slug', v_business.slug,
            'ai_receptionist_enabled', true,
            'default_language', COALESCE(v_settings.default_language, 'en'),
            'welcome_message', v_settings.welcome_message,
            'faqs', COALESCE(v_settings.faqs, '[]'::jsonb)
        )
    );
END;
$$;

-- Function execution privileges
REVOKE ALL ON FUNCTION public.get_public_ai_settings_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_ai_settings_by_slug(TEXT) TO anon, authenticated, service_role;
