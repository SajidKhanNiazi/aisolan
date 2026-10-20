-- ==============================================================================
-- Migration: 20261019000002_create_business_onboarding_and_settings.sql
-- Description: Business onboarding, profile extension, opening hours, schedule exceptions,
--              booking policies, and onboarding progress tracking for BookPilot AI Phase 1C.
-- ==============================================================================

-- 1. EXTEND BUSINESSES (TENANTS) TABLE WITH PROFILE & LOCATION FIELDS
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state_region TEXT,
    ADD COLUMN IF NOT EXISTS postal_code TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'GB',
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Add check constraint for valid timezone length and sensible website/phone constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_timezone_length'
    ) THEN
        ALTER TABLE public.businesses
            ADD CONSTRAINT chk_businesses_timezone_length CHECK (char_length(timezone) >= 2 AND char_length(timezone) <= 64);
    END IF;
END $$;

-- 2. BUSINESS OPENING HOURS TABLE (Monday=1 through Sunday=7 or 0-6; we standardize on 0=Sunday, 1=Monday ... 6=Saturday)
-- Normalized representation supporting multiple intervals per day (e.g. 09:00-13:00 and 14:00-18:00)
CREATE TABLE IF NOT EXISTS public.business_opening_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    open_time TIME NULL,
    close_time TIME NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_opening_hours_time_order CHECK (
        is_closed = TRUE OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
    )
);

CREATE INDEX IF NOT EXISTS idx_opening_hours_business_day 
    ON public.business_opening_hours (business_id, day_of_week);

-- 3. BUSINESS SCHEDULE EXCEPTIONS & HOLIDAYS TABLE
-- Supports full-day closures, holiday reasons, and date-specific exceptional operating intervals
CREATE TABLE IF NOT EXISTS public.business_schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT TRUE,
    open_time TIME NULL,
    close_time TIME NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_exception_time_order CHECK (
        is_closed = TRUE OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
    )
);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_business_date 
    ON public.business_schedule_exceptions (business_id, exception_date);

-- 4. BUSINESS BOOKING POLICIES TABLE
-- Stores booking preferences, notices, buffer preferences, and cancellation rules
CREATE TABLE IF NOT EXISTS public.business_booking_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    min_notice_hours INTEGER NOT NULL DEFAULT 2 CHECK (min_notice_hours >= 0 AND min_notice_hours <= 720),
    max_advance_days INTEGER NOT NULL DEFAULT 60 CHECK (max_advance_days >= 1 AND max_advance_days <= 365),
    cancellation_notice_hours INTEGER NOT NULL DEFAULT 24 CHECK (cancellation_notice_hours >= 0 AND cancellation_notice_hours <= 720),
    default_buffer_minutes INTEGER NOT NULL DEFAULT 10 CHECK (default_buffer_minutes >= 0 AND default_buffer_minutes <= 120),
    online_booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_policy_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BUSINESS ONBOARDING PROGRESS TABLE
-- Tracks the 5-step onboarding wizard progress
CREATE TABLE IF NOT EXISTS public.business_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
    completed_steps INTEGER[] NOT NULL DEFAULT '{}',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. BUSINESS OPENING HOURS RLS
ALTER TABLE public.business_opening_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opening_hours_select_member"
    ON public.business_opening_hours FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "opening_hours_modify_owner"
    ON public.business_opening_hours FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

-- Also allow public reading of business opening hours for public booking page (Phase 1A/Phase 1E)
CREATE POLICY "opening_hours_select_public"
    ON public.business_opening_hours FOR SELECT
    TO anon
    USING (TRUE);

-- B. BUSINESS SCHEDULE EXCEPTIONS RLS
ALTER TABLE public.business_schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exceptions_select_member"
    ON public.business_schedule_exceptions FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "exceptions_modify_owner"
    ON public.business_schedule_exceptions FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "exceptions_select_public"
    ON public.business_schedule_exceptions FOR SELECT
    TO anon
    USING (TRUE);

-- C. BUSINESS BOOKING POLICIES RLS
ALTER TABLE public.business_booking_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policies_select_member"
    ON public.business_booking_policies FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "policies_modify_owner"
    ON public.business_booking_policies FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "policies_select_public"
    ON public.business_booking_policies FOR SELECT
    TO anon
    USING (TRUE);

-- D. BUSINESS ONBOARDING PROGRESS RLS
ALTER TABLE public.business_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select_member"
    ON public.business_onboarding_progress FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "onboarding_modify_owner"
    ON public.business_onboarding_progress FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET CONFIGURATION FOR BUSINESS LOGOS
-- ==============================================================================

-- Create bucket 'business-logos' if storage schema is active
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-logos',
    'business-logos',
    TRUE,
    2097152, -- 2MB maximum file size
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage RLS: Public can view uploaded logos
CREATE POLICY "business_logos_public_read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'business-logos');

-- Storage RLS: Authenticated users can upload logos only to folders matching business IDs where they are owners
-- File path convention: business-logos/{business_id}/{filename}
CREATE POLICY "business_logos_owner_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'business-logos' AND
        public.is_business_owner((storage.foldername(name))[1]::uuid, auth.uid())
    );

CREATE POLICY "business_logos_owner_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'business-logos' AND
        public.is_business_owner((storage.foldername(name))[1]::uuid, auth.uid())
    );

CREATE POLICY "business_logos_owner_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'business-logos' AND
        public.is_business_owner((storage.foldername(name))[1]::uuid, auth.uid())
    );
