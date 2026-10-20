-- ==============================================================================
-- Migration: 20261019000003_create_services_and_staff_management.sql
-- Description: Services, Pricing, Staff Profiles, Service-Staff Assignments,
--              Staff Working Shifts, Recurring Breaks, and Staff Time Off.
-- Phase: BookPilot AI Phase 1D
-- ==============================================================================

-- 1. ADD CURRENCY TO BUSINESSES (Default: GBP for UK market, ISO 4217 compliant)
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GBP';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_currency_code'
    ) THEN
        ALTER TABLE public.businesses
            ADD CONSTRAINT chk_businesses_currency_code 
            CHECK (char_length(currency) = 3);
    END IF;
END $$;

-- 2. SERVICE CATEGORIES TABLE
-- Supports business-specific categorization (e.g. "Haircuts", "Beard & Grooming", "Hair Styling")
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_categories_business_name UNIQUE (business_id, name),
    CONSTRAINT chk_service_categories_name_length CHECK (char_length(trim(name)) >= 2 AND char_length(name) <= 60)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_business 
    ON public.service_categories (business_id, display_order);

-- 3. SERVICES TABLE
-- Stored prices in minor units (integer pence/cents) to avoid floating-point errors.
-- Duration stored in integer minutes.
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'GBP' CHECK (char_length(currency) = 3),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 720),
    buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_services_business_id UNIQUE (business_id, id),
    CONSTRAINT chk_services_name_length CHECK (char_length(trim(name)) >= 2 AND char_length(name) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_services_business_active 
    ON public.services (business_id, is_active, is_archived, display_order);

CREATE INDEX IF NOT EXISTS idx_services_category 
    ON public.services (category_id);

-- 4. STAFF PROFILES TABLE
-- Schedulable employee profiles. Does not require a Supabase Auth login.
-- Can optionally link to business_members (user_id) for authenticated staff logins.
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    professional_title TEXT,
    bio TEXT,
    avatar_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_staff_profiles_business_id UNIQUE (business_id, id),
    CONSTRAINT chk_staff_display_name_length CHECK (char_length(trim(display_name)) >= 2 AND char_length(display_name) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_business_active 
    ON public.staff_profiles (business_id, is_active, is_archived, display_order);

-- 5. STAFF SERVICES (MANY-TO-MANY RELATIONSHIP WITH CROSS-TENANT INTEGRITY)
-- Composite foreign keys (business_id, staff_id) and (business_id, service_id)
-- ensure a staff member can only be assigned to services of the SAME business.
CREATE TABLE IF NOT EXISTS public.staff_services (
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    service_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (staff_id, service_id),
    CONSTRAINT fk_staff_services_staff 
        FOREIGN KEY (business_id, staff_id) 
        REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_services_service 
        FOREIGN KEY (business_id, service_id) 
        REFERENCES public.services(business_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_services_service 
    ON public.staff_services (service_id);

CREATE INDEX IF NOT EXISTS idx_staff_services_business 
    ON public.staff_services (business_id);

-- 6. STAFF WORKING HOURS (RECURRING WEEKLY SHIFTS)
-- Stored as wall-clock times in business-local timezone.
-- day_of_week: 0=Sunday, 1=Monday ... 6=Saturday
CREATE TABLE IF NOT EXISTS public.staff_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_working BOOLEAN NOT NULL DEFAULT TRUE,
    open_time TIME NULL,
    close_time TIME NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_staff_working_hours_staff 
        FOREIGN KEY (business_id, staff_id) 
        REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE,
    CONSTRAINT chk_staff_working_hours_order 
        CHECK (is_working = FALSE OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time))
);

CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff_day 
    ON public.staff_working_hours (business_id, staff_id, day_of_week);

-- 7. STAFF BREAKS TABLE (RECURRING DAILY BREAKS)
-- Subtracted from working intervals during availability calculations in Phase 1E.
CREATE TABLE IF NOT EXISTS public.staff_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    break_title TEXT NOT NULL DEFAULT 'Lunch Break',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_staff_breaks_staff 
        FOREIGN KEY (business_id, staff_id) 
        REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE,
    CONSTRAINT chk_staff_breaks_order 
        CHECK (start_time < end_time),
    CONSTRAINT chk_staff_break_title_length 
        CHECK (char_length(trim(break_title)) >= 2 AND char_length(break_title) <= 60)
);

CREATE INDEX IF NOT EXISTS idx_staff_breaks_staff_day 
    ON public.staff_breaks (business_id, staff_id, day_of_week);

-- 8. STAFF TIME OFF TABLE (VACATIONS, SICK LEAVE, UNAVAILABLE PERIODS)
-- Date boundaries stored in business-local calendar dates.
CREATE TABLE IF NOT EXISTS public.staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIME NULL,
    end_time TIME NULL,
    reason_type TEXT NOT NULL DEFAULT 'vacation' CHECK (reason_type IN ('vacation', 'sick', 'personal', 'training', 'other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_staff_time_off_staff 
        FOREIGN KEY (business_id, staff_id) 
        REFERENCES public.staff_profiles(business_id, id) ON DELETE CASCADE,
    CONSTRAINT chk_staff_time_off_dates 
        CHECK (start_date <= end_date),
    CONSTRAINT chk_staff_time_off_times 
        CHECK (is_full_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_dates 
    ON public.staff_time_off (business_id, staff_id, start_date, end_date);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. SERVICE CATEGORIES
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_categories_select_member"
    ON public.service_categories FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "service_categories_modify_owner"
    ON public.service_categories FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "service_categories_select_public"
    ON public.service_categories FOR SELECT
    TO anon
    USING (TRUE);

-- B. SERVICES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select_member"
    ON public.services FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "services_modify_owner"
    ON public.services FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "services_select_public"
    ON public.services FOR SELECT
    TO anon
    USING (is_active = TRUE AND is_archived = FALSE);

-- C. STAFF PROFILES
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_profiles_select_member"
    ON public.staff_profiles FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "staff_profiles_modify_owner"
    ON public.staff_profiles FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

-- Public can view active staff name and title for public booking (Phase 1E)
-- Contact info is protected by application queries and not selected for anon
CREATE POLICY "staff_profiles_select_public"
    ON public.staff_profiles FOR SELECT
    TO anon
    USING (is_active = TRUE AND is_archived = FALSE);

-- D. STAFF SERVICES
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_services_select_member"
    ON public.staff_services FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "staff_services_modify_owner"
    ON public.staff_services FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "staff_services_select_public"
    ON public.staff_services FOR SELECT
    TO anon
    USING (TRUE);

-- E. STAFF WORKING HOURS
ALTER TABLE public.staff_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_working_hours_select_member"
    ON public.staff_working_hours FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "staff_working_hours_modify_owner"
    ON public.staff_working_hours FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "staff_working_hours_select_public"
    ON public.staff_working_hours FOR SELECT
    TO anon
    USING (TRUE);

-- F. STAFF BREAKS
ALTER TABLE public.staff_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_breaks_select_member"
    ON public.staff_breaks FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "staff_breaks_modify_owner"
    ON public.staff_breaks FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

CREATE POLICY "staff_breaks_select_public"
    ON public.staff_breaks FOR SELECT
    TO anon
    USING (TRUE);

-- G. STAFF TIME OFF
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_time_off_select_member"
    ON public.staff_time_off FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "staff_time_off_modify_owner"
    ON public.staff_time_off FOR ALL
    TO authenticated
    USING (public.is_business_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_owner(business_id, auth.uid()));

-- Anon can read staff time-off dates for slot blackout in Phase 1E (reasons hidden at query level)
CREATE POLICY "staff_time_off_select_public"
    ON public.staff_time_off FOR SELECT
    TO anon
    USING (TRUE);
