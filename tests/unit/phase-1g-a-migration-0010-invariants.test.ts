/**
 * BookPilot AI — Phase 1G-A Migration 0010 Invariant Verification Test Suite
 * Compares migration 0010 against canonical migration 0008 to ensure ZERO scheduling regressions.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 1G-A: Migration 0010 Canonical Booking Invariants vs Migration 0008", () => {
  const mig0008Path = path.resolve(__dirname, "../../supabase/migrations/20261022000008_fix_public_booking_atomic_schema.sql");
  const mig0010Path = path.resolve(__dirname, "../../supabase/migrations/20261022000010_create_notification_outbox.sql");

  const mig0008Sql = fs.readFileSync(mig0008Path, "utf8");
  const mig0010Sql = fs.readFileSync(mig0010Path, "utf8");

  it("verifies parity of core input validation between migration 0008 and 0010", () => {
    // Both migrations must enforce the exact same input validation code
    expect(mig0008Sql).toContain("IF p_starts_at < pg_catalog.now() THEN");
    expect(mig0010Sql).toContain("IF p_starts_at < pg_catalog.now() THEN");
  });

  it("verifies currency snapshot does NOT multiply price_amount by 100", () => {
    // Defect 1: ROUND(v_service.price_amount * 100) must NEVER appear
    expect(mig0010Sql).not.toContain("price_amount * 100");
    expect(mig0010Sql).not.toContain("ROUND(v_service.price_amount * 100)");

    // Must use canonical v_service.price_amount as in 0008
    expect(mig0010Sql).toContain("v_service.price_amount,");
  });

  it("verifies fail-closed behavior for online booking policies", () => {
    // Defect 3: Must fail-closed if policy row is missing or online_booking_enabled is false/null
    const expectedPolicyGuard = "IF NOT FOUND OR NOT COALESCE(v_policy.online_booking_enabled, false) THEN";
    expect(mig0010Sql).toContain(expectedPolicyGuard);
    expect(mig0010Sql).toContain("'ONLINE_BOOKING_DISABLED'");
  });

  it("verifies salon opening hours validation is preserved", () => {
    // Defect 2: Opening hours check
    expect(mig0010Sql).toContain("FROM public.business_opening_hours");
    expect(mig0010Sql).toContain("open_time <= v_local_occupied_start_time");
    expect(mig0010Sql).toContain("close_time >= v_local_occupied_end_time");
    expect(mig0010Sql).toContain("'SALON_CLOSED'");
  });

  it("verifies minimum notice and maximum advance booking window checks", () => {
    expect(mig0010Sql).toContain("COALESCE(v_policy.min_notice_hours, 2) * INTERVAL '1 hour'");
    expect(mig0010Sql).toContain("COALESCE(v_policy.max_advance_days, 60) * INTERVAL '1 day'");
    expect(mig0010Sql).toContain("'OUTSIDE_BOOKING_WINDOW'");
  });

  it("verifies staff shifts, breaks, and time-off checks are preserved for specific staff and Any Available", () => {
    // Staff working hours
    expect(mig0010Sql).toContain("FROM public.staff_working_hours");
    expect(mig0010Sql).toContain("'STAFF_NOT_WORKING'");

    // Staff breaks
    expect(mig0010Sql).toContain("FROM public.staff_breaks");
    expect(mig0010Sql).toContain("'STAFF_ON_BREAK'");

    // Staff time-off
    expect(mig0010Sql).toContain("FROM public.staff_time_off");
    expect(mig0010Sql).toContain("'STAFF_TIME_OFF'");

    // 'Any Available' candidate evaluation loop
    expect(mig0010Sql).toContain("'NO_STAFF_AVAILABLE'");
  });

  it("verifies customer transaction atomicity rolls back orphaned customer records on failure", () => {
    // Defect 4: Orphaned customer deletion on conflict/error
    const customerCleanupSnippet = "IF v_created_customer_id IS NOT NULL THEN\n                DELETE FROM public.customers WHERE id = v_created_customer_id;\n            END IF;";
    const normalized0010 = mig0010Sql.replace(/\r\n/g, "\n");
    expect(normalized0010).toContain(customerCleanupSnippet);
    expect(mig0010Sql).toContain("WHEN exclusion_violation THEN");
    expect(mig0010Sql).toContain("'SLOT_TAKEN'");
  });

  it("verifies idempotency replay and response field formats match migration 0008 exactly", () => {
    // Defect 5: Booking reference format must match migration 0008: 8 characters upper hex
    expect(mig0010Sql).toContain("'booking_reference', pg_catalog.upper(pg_catalog.substr(v_appointment.id::text, 1, 8))");
    
    // Idempotency replay check
    expect(mig0010Sql).toContain("'is_idempotent_replay', true");
    expect(mig0010Sql).toContain("'IDEMPOTENCY_CONFLICT'");
  });

  it("verifies dropping the 11-argument function eliminates PostgREST overload ambiguity", () => {
    expect(mig0010Sql).toContain("DROP FUNCTION IF EXISTS public.create_public_appointment_atomic(\n    TEXT, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ\n);");
  });

  it("verifies atomic outbox payload enrichment is executed inside the transaction", () => {
    expect(mig0010Sql).toContain("UPDATE public.notification_outbox\n            SET payload = payload || pg_catalog.jsonb_build_object('management_url', pg_catalog.btrim(p_management_url))\n            WHERE appointment_id = v_appointment.id\n              AND template_key = 'customer_booking_confirmation';");
  });

  it("verifies SECURITY DEFINER and service_role execution permissions", () => {
    expect(mig0010Sql).toContain("SECURITY DEFINER\nSET search_path = ''");
    expect(mig0010Sql).toContain("REVOKE ALL ON FUNCTION public.create_public_appointment_atomic(TEXT, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;");
    expect(mig0010Sql).toContain("GRANT EXECUTE ON FUNCTION public.create_public_appointment_atomic(TEXT, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;");
  });
});
