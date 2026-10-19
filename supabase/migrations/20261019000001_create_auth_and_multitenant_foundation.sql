-- ==============================================================================
-- Migration: 20261019000001_create_auth_and_multitenant_foundation.sql
-- Description: Core schema for BookPilot AI Phase 1B (Profiles, Businesses, Business Members, RLS, and Atomic Onboarding)
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BUSINESSES (TENANTS) TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    business_type TEXT NOT NULL DEFAULT 'salon' CHECK (business_type IN ('salon', 'barbershop', 'spa', 'trainer', 'other')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_business_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT chk_business_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) >= 3 AND char_length(slug) <= 60)
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses (slug);
CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON public.businesses (created_by);

-- 3. BUSINESS MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_business_member UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members (user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON public.business_members (business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_lookup ON public.business_members (business_id, user_id);

-- 4. PROFILE AUTO-CREATION TRIGGER ON AUTH.USERS INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ATOMIC BUSINESS ONBOARDING RPC
-- Ensures business creation and initial owner membership commit together in a single transaction.
-- Derives owner identity securely from auth.uid().
CREATE OR REPLACE FUNCTION public.create_business_with_owner(
    p_name TEXT,
    p_slug TEXT,
    p_business_type TEXT DEFAULT 'salon'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_normalized_slug TEXT;
    v_business_id UUID;
    v_result JSONB;
BEGIN
    -- Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated to create a business.'
            USING ERRCODE = '42501';
    END IF;

    -- Normalize slug
    v_normalized_slug := lower(trim(p_slug));

    -- Validate input format
    IF char_length(trim(p_name)) < 2 OR char_length(trim(p_name)) > 100 THEN
        RAISE EXCEPTION 'Validation Error: Business name must be between 2 and 100 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF v_normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR char_length(v_normalized_slug) < 3 OR char_length(v_normalized_slug) > 60 THEN
        RAISE EXCEPTION 'Validation Error: Business slug must contain only lowercase letters, numbers, and hyphens (3-60 characters).'
            USING ERRCODE = '22023';
    END IF;

    IF p_business_type NOT IN ('salon', 'barbershop', 'spa', 'trainer', 'other') THEN
        RAISE EXCEPTION 'Validation Error: Invalid business type.'
            USING ERRCODE = '22023';
    END IF;

    -- Check slug uniqueness
    IF EXISTS (SELECT 1 FROM public.businesses WHERE slug = v_normalized_slug) THEN
        RAISE EXCEPTION 'Conflict: The slug "%" is already taken. Please choose another.', v_normalized_slug
            USING ERRCODE = '23505';
    END IF;

    -- 1. Insert Business
    INSERT INTO public.businesses (name, slug, business_type, created_by)
    VALUES (trim(p_name), v_normalized_slug, p_business_type, v_user_id)
    RETURNING id INTO v_business_id;

    -- 2. Insert Initial Owner Membership atomically
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (v_business_id, v_user_id, 'owner');

    -- Build return payload
    SELECT jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'business_type', b.business_type,
        'created_by', b.created_by,
        'role', 'owner',
        'created_at', b.created_at
    ) INTO v_result
    FROM public.businesses b
    WHERE b.id = v_business_id;

    RETURN v_result;
END;
$$;

-- Revoke public execution and grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.create_business_with_owner(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(TEXT, TEXT, TEXT) TO authenticated;

-- 6. PREVENT REMOVING THE LAST BUSINESS OWNER TRIGGER
CREATE OR REPLACE FUNCTION public.check_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN
        IF (SELECT COUNT(*) FROM public.business_members WHERE business_id = OLD.business_id AND role = 'owner') <= 1 THEN
            RAISE EXCEPTION 'Forbidden: Cannot delete or demote the sole business owner.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.business_members;
CREATE TRIGGER trg_prevent_last_owner_removal
    BEFORE DELETE OR UPDATE OF role ON public.business_members
    FOR EACH ROW EXECUTE FUNCTION public.check_last_owner();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- B. BUSINESSES RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Valid members can select businesses they belong to
CREATE POLICY "businesses_select_member"
    ON public.businesses FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = businesses.id
              AND bm.user_id = auth.uid()
        )
    );

-- Only owners can update business metadata
CREATE POLICY "businesses_update_owner"
    ON public.businesses FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = businesses.id
              AND bm.user_id = auth.uid()
              AND bm.role = 'owner'
        )
    )
    WITH CHECK (
        created_by = (SELECT b.created_by FROM public.businesses b WHERE b.id = businesses.id)
    );

-- Prevent direct arbitrary insert; inserts must go through create_business_with_owner RPC
-- Or if inserted directly, created_by must equal auth.uid()
CREATE POLICY "businesses_insert_creator"
    ON public.businesses FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- Only owners can delete a business
CREATE POLICY "businesses_delete_owner"
    ON public.businesses FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = businesses.id
              AND bm.user_id = auth.uid()
              AND bm.role = 'owner'
        )
    );

-- C. BUSINESS MEMBERS RLS
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Users can read memberships for any business they are a member of
CREATE POLICY "business_members_select_member"
    ON public.business_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = business_members.business_id
              AND bm.user_id = auth.uid()
        )
    );

-- Only owners can insert new members into their business
CREATE POLICY "business_members_insert_owner"
    ON public.business_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = business_members.business_id
              AND bm.user_id = auth.uid()
              AND bm.role = 'owner'
        )
    );

-- Only owners can update member roles
CREATE POLICY "business_members_update_owner"
    ON public.business_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = business_members.business_id
              AND bm.user_id = auth.uid()
              AND bm.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = business_members.business_id
              AND bm.user_id = auth.uid()
              AND bm.role = 'owner'
        )
    );

-- Only owners can delete/remove members, except users can remove themselves (leave business, unless sole owner)
CREATE POLICY "business_members_delete_owner_or_self"
    ON public.business_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = business_members.business_id
              AND bm.user_id = auth.uid()
              AND bm.role = 'owner'
        )
    );
