-- ==============================================================================
-- Migration: 20261031000015_create_whatsapp_integration.sql
-- Description: Phase 1H-D1 Meta WhatsApp Cloud API Integration Schema.
--              Multi-tenant connections, conversation session tracking,
--              message audit history, durable webhook event queue,
--              and template registry with strict RLS tenant isolation.
-- Security:
--   - Hardened multi-tenant composite foreign keys preventing cross-tenant
--     connection, conversation, draft, or assigned staff hijacking.
--   - Tenant immutability triggers preventing business_id reassignment.
--   - Column-level privilege restrictions protecting credential_reference.
--   - SECURITY DEFINER atomic worker claim RPC with search_path = ''.
-- ==============================================================================

-- 1. WHATSAPP CONNECTIONS TABLE
-- Maps Meta WhatsApp Business Account (WABA) and Phone Number ID to a tenant business.
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'meta_cloud_api' CHECK (provider IN ('meta_cloud_api')),
    waba_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    business_display_number TEXT,
    verified_name TEXT,
    connection_status TEXT NOT NULL DEFAULT 'active' CHECK (connection_status IN ('active', 'disconnected', 'suspended')),
    credential_reference TEXT,
    ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    last_webhook_received_at TIMESTAMPTZ,
    last_error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Enforce unique active phone number mapping across the platform
    CONSTRAINT uq_whatsapp_connections_phone_number UNIQUE (phone_number_id),
    -- Composite unique constraint to support cross-tenant foreign key verification
    CONSTRAINT uq_whatsapp_connections_business_id UNIQUE (business_id, id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_business_id
    ON public.whatsapp_connections (business_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_lookup
    ON public.whatsapp_connections (phone_number_id, connection_status);


-- 2. WHATSAPP CONVERSATIONS TABLE
-- Tracks ongoing conversation sessions per customer WhatsApp ID within a business.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL,
    customer_wa_id TEXT NOT NULL,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'opted_out')),
    ai_mode TEXT NOT NULL DEFAULT 'ai' CHECK (ai_mode IN ('ai', 'human_handoff', 'paused')),
    assigned_human_id UUID,
    durable_booking_draft_id UUID REFERENCES public.conversational_booking_drafts(id) ON DELETE SET NULL,
    last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service_window_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique customer per tenant business
    CONSTRAINT uq_whatsapp_conversations_business_customer UNIQUE (business_id, customer_wa_id),
    -- Composite unique constraint to support composite foreign keys for messages
    CONSTRAINT uq_whatsapp_conversations_business_id UNIQUE (business_id, id),
    -- Multi-tenant composite foreign key: guarantees connection belongs to the same business
    CONSTRAINT fk_whatsapp_conversations_connection
        FOREIGN KEY (business_id, connection_id)
        REFERENCES public.whatsapp_connections(business_id, id)
        ON DELETE CASCADE,
    -- Multi-tenant composite foreign key: guarantees assigned human is a verified member of this salon
    CONSTRAINT fk_whatsapp_conversations_assigned_human
        FOREIGN KEY (business_id, assigned_human_id)
        REFERENCES public.business_members(business_id, user_id)
        ON DELETE SET NULL (assigned_human_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_business_id
    ON public.whatsapp_conversations (business_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_lookup
    ON public.whatsapp_conversations (business_id, customer_wa_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_window
    ON public.whatsapp_conversations (service_window_expires_at);


-- Cross-tenant draft isolation trigger on whatsapp_conversations
CREATE OR REPLACE FUNCTION public.validate_whatsapp_conversation_draft()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.durable_booking_draft_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.conversational_booking_drafts AS d
            WHERE d.id = NEW.durable_booking_draft_id
              AND d.business_id = NEW.business_id
        ) THEN
            RAISE EXCEPTION 'Cross-tenant violation: booking draft % does not belong to business %',
                NEW.durable_booking_draft_id, NEW.business_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_whatsapp_conversation_draft ON public.whatsapp_conversations;
CREATE TRIGGER trg_validate_whatsapp_conversation_draft
    BEFORE INSERT OR UPDATE OF business_id, durable_booking_draft_id
    ON public.whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_whatsapp_conversation_draft();


-- 3. WHATSAPP MESSAGES TABLE
-- Audit log of all inbound and outbound WhatsApp messages.
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    provider_message_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (
        message_type IN ('text', 'interactive_button', 'interactive_list', 'template', 'unknown', 'unsupported')
    ),
    sanitized_content TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'received' CHECK (
        delivery_status IN ('received', 'queued', 'pending_send', 'sent', 'delivered', 'read', 'failed', 'ambiguous_outcome', 'mock_sent')
    ),
    provider_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Deduplication on provider message ID
    CONSTRAINT uq_whatsapp_messages_provider_id UNIQUE (provider_message_id),
    -- Multi-tenant composite foreign key: guarantees conversation belongs to the same business
    CONSTRAINT fk_whatsapp_messages_conversation
        FOREIGN KEY (business_id, conversation_id)
        REFERENCES public.whatsapp_conversations(business_id, id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_business_id
    ON public.whatsapp_messages (business_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id
    ON public.whatsapp_messages (conversation_id, created_at DESC);


-- 4. WHATSAPP WEBHOOK EVENTS (DURABLE INBOUND QUEUE / OUTBOX)
-- Durable event table for reliable, asynchronous webhook event ingestion.
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_key TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('message', 'status', 'error', 'unknown')),
    phone_number_id TEXT NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processing_status TEXT NOT NULL DEFAULT 'queued' CHECK (
        processing_status IN ('queued', 'processing', 'completed', 'retry_pending', 'failed', 'ignored')
    ),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    last_error_code TEXT,
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Concurrency & Event Deduplication
    CONSTRAINT uq_whatsapp_webhook_events_key UNIQUE (provider_event_key)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_claim
    ON public.whatsapp_webhook_events (next_attempt_at ASC, created_at ASC)
    WHERE processing_status IN ('queued', 'retry_pending');

-- Stale lease recovery index
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_lease_recovery
    ON public.whatsapp_webhook_events (lease_expires_at ASC)
    WHERE processing_status = 'processing';

-- Atomic claim function using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_due_whatsapp_events_atomic(
    p_batch_size INTEGER DEFAULT 10,
    p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
    id UUID,
    provider_event_key TEXT,
    event_type TEXT,
    phone_number_id TEXT,
    business_id UUID,
    payload JSONB,
    processing_status TEXT,
    attempt_count INTEGER,
    max_attempts INTEGER,
    next_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_lease_expiry TIMESTAMPTZ := v_now + (p_lease_seconds || ' seconds')::interval;
BEGIN
    RETURN QUERY
    WITH due_events AS (
        SELECT events.id AS target_id
        FROM public.whatsapp_webhook_events AS events
        WHERE (
            -- Due queued or retryable events
            (events.processing_status IN ('queued', 'retry_pending') AND events.next_attempt_at <= v_now)
            OR
            -- Stale processing events whose lease expired (crash recovery)
            (events.processing_status = 'processing' AND events.lease_expires_at < v_now)
        )
        ORDER BY events.next_attempt_at ASC, events.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.whatsapp_webhook_events AS e
        SET processing_status = 'processing',
            claimed_at = v_now,
            lease_expires_at = v_lease_expiry,
            attempt_count = e.attempt_count + 1
        FROM due_events
        WHERE e.id = due_events.target_id
        RETURNING
            e.id,
            e.provider_event_key,
            e.event_type,
            e.phone_number_id,
            e.business_id,
            e.payload,
            e.processing_status,
            e.attempt_count,
            e.max_attempts,
            e.next_attempt_at,
            e.created_at
    )
    SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_whatsapp_events_atomic(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_whatsapp_events_atomic(INTEGER, INTEGER) TO service_role;


-- 5. WHATSAPP TEMPLATE REGISTRY
-- Approved WhatsApp Business templates registry for outbound messages outside 24h window.
CREATE TABLE IF NOT EXISTS public.whatsapp_template_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider_template_id TEXT,
    template_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    category TEXT NOT NULL DEFAULT 'UTILITY' CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
    approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED')),
    purpose TEXT NOT NULL CHECK (purpose IN ('booking_confirmation', 'reminder', 'reschedule_alert', 'cancellation_alert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_whatsapp_templates_biz_name_lang UNIQUE (business_id, template_name, language)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_business_id
    ON public.whatsapp_template_registry (business_id);


-- ==============================================================================
-- TENANT IMMUTABILITY TRIGGERS (Prevent business_id Reassignment)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_whatsapp_business_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.business_id <> OLD.business_id THEN
        RAISE EXCEPTION 'Security violation: business_id is immutable and cannot be reassigned across tenants'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_reassign_whatsapp_connections ON public.whatsapp_connections;
CREATE TRIGGER trg_prevent_reassign_whatsapp_connections
    BEFORE UPDATE OF business_id ON public.whatsapp_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_whatsapp_business_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_reassign_whatsapp_conversations ON public.whatsapp_conversations;
CREATE TRIGGER trg_prevent_reassign_whatsapp_conversations
    BEFORE UPDATE OF business_id ON public.whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_whatsapp_business_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_reassign_whatsapp_messages ON public.whatsapp_messages;
CREATE TRIGGER trg_prevent_reassign_whatsapp_messages
    BEFORE UPDATE OF business_id ON public.whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_whatsapp_business_reassignment();

DROP TRIGGER IF EXISTS trg_prevent_reassign_whatsapp_templates ON public.whatsapp_template_registry;
CREATE TRIGGER trg_prevent_reassign_whatsapp_templates
    BEFORE UPDATE OF business_id ON public.whatsapp_template_registry
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_whatsapp_business_reassignment();


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PRIVILEGES
-- ==============================================================================

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_registry ENABLE ROW LEVEL SECURITY;

-- Revoke all direct public, anonymous, and broad authenticated access
REVOKE ALL ON TABLE public.whatsapp_connections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.whatsapp_conversations FROM PUBLIC, anon;
REVOKE ALL ON public.whatsapp_messages FROM PUBLIC, anon;
REVOKE ALL ON public.whatsapp_webhook_events FROM PUBLIC, anon;
REVOKE ALL ON public.whatsapp_template_registry FROM PUBLIC, anon;

-- Grant service role full management
GRANT ALL ON TABLE public.whatsapp_connections TO service_role;
GRANT ALL ON TABLE public.whatsapp_conversations TO service_role;
GRANT ALL ON TABLE public.whatsapp_messages TO service_role;
GRANT ALL ON TABLE public.whatsapp_webhook_events TO service_role;
GRANT ALL ON TABLE public.whatsapp_template_registry TO service_role;

-- Grant authenticated users tenant-scoped access, strictly EXCLUDING credential_reference
GRANT SELECT (
    id, business_id, provider, waba_id, phone_number_id, business_display_number,
    verified_name, connection_status, ai_enabled, booking_enabled, connected_at,
    disconnected_at, last_webhook_received_at, last_error_code, created_at, updated_at
) ON TABLE public.whatsapp_connections TO authenticated;

GRANT INSERT (
    id, business_id, provider, waba_id, phone_number_id, business_display_number,
    verified_name, connection_status, ai_enabled, booking_enabled
) ON TABLE public.whatsapp_connections TO authenticated;

GRANT UPDATE (
    provider, waba_id, phone_number_id, business_display_number, verified_name,
    connection_status, ai_enabled, booking_enabled, disconnected_at
) ON TABLE public.whatsapp_connections TO authenticated;

GRANT DELETE ON TABLE public.whatsapp_connections TO authenticated;

-- Grant authenticated access to conversation, message, and template tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.whatsapp_messages TO authenticated;
GRANT SELECT ON TABLE public.whatsapp_webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_template_registry TO authenticated;

-- Policies: whatsapp_connections
CREATE POLICY "whatsapp_connections_select"
    ON public.whatsapp_connections FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "whatsapp_connections_insert"
    ON public.whatsapp_connections FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "whatsapp_connections_update"
    ON public.whatsapp_connections FOR UPDATE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "whatsapp_connections_delete"
    ON public.whatsapp_connections FOR DELETE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()));

-- Policies: whatsapp_conversations
CREATE POLICY "whatsapp_conversations_select"
    ON public.whatsapp_conversations FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "whatsapp_conversations_insert"
    ON public.whatsapp_conversations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "whatsapp_conversations_update"
    ON public.whatsapp_conversations FOR UPDATE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "whatsapp_conversations_delete"
    ON public.whatsapp_conversations FOR DELETE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()));

-- Policies: whatsapp_messages
CREATE POLICY "whatsapp_messages_select"
    ON public.whatsapp_messages FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "whatsapp_messages_insert"
    ON public.whatsapp_messages FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_member(business_id, auth.uid()));

-- Policies: whatsapp_webhook_events (Manager/Owner view only)
CREATE POLICY "whatsapp_webhook_events_select"
    ON public.whatsapp_webhook_events FOR SELECT
    TO authenticated
    USING (business_id IS NOT NULL AND public.is_business_manager_or_owner(business_id, auth.uid()));

-- Policies: whatsapp_template_registry
CREATE POLICY "whatsapp_template_registry_select"
    ON public.whatsapp_template_registry FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id, auth.uid()));

CREATE POLICY "whatsapp_template_registry_insert"
    ON public.whatsapp_template_registry FOR INSERT
    TO authenticated
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "whatsapp_template_registry_update"
    ON public.whatsapp_template_registry FOR UPDATE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()))
    WITH CHECK (public.is_business_manager_or_owner(business_id, auth.uid()));

CREATE POLICY "whatsapp_template_registry_delete"
    ON public.whatsapp_template_registry FOR DELETE
    TO authenticated
    USING (public.is_business_manager_or_owner(business_id, auth.uid()));
