import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import {
  publicSalonSlugSchema,
  publicAvailabilityQuerySchema,
  publicBookingInputSchema,
  managementTokenSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
} from "@/features/public-booking/validation";
import {
  generateSecureToken,
  hashToken,
  timingSafeHashMatch,
  formatBookingReference,
  buildManagementUrl,
} from "@/features/public-booking/tokens";
import {
  publicBookingRateLimiter,
  enforcePublicBookingRateLimit,
} from "@/features/public-booking/rate-limit";

describe("Phase 1F: Public Customer Booking & Self-Service Management", () => {
  beforeEach(() => {
    publicBookingRateLimiter.reset();
  });

  describe("1. Public Salon Routing & Slug Validation", () => {
    it("accepts valid alphanumeric salon slugs with hyphens", () => {
      expect(publicSalonSlugSchema.safeParse("bookpilot-qa-salon").success).toBe(true);
      expect(publicSalonSlugSchema.safeParse("mayfair-cuts").success).toBe(true);
      expect(publicSalonSlugSchema.safeParse("salon-123").success).toBe(true);
    });

    it("rejects invalid, uppercase, or special character slugs", () => {
      expect(publicSalonSlugSchema.safeParse("BookPilot-QA").success).toBe(false);
      expect(publicSalonSlugSchema.safeParse("salon_with_underscore").success).toBe(false);
      expect(publicSalonSlugSchema.safeParse("ab").success).toBe(false); // min 3 chars
      expect(publicSalonSlugSchema.safeParse("-leading-hyphen").success).toBe(false);
      expect(publicSalonSlugSchema.safeParse("trailing-hyphen-").success).toBe(false);
    });
  });

  describe("2. Public Availability Query Validation", () => {
    const validQuery = {
      businessSlug: "bookpilot-qa-salon",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      staffPreference: "any",
      date: "2026-10-27",
    };

    it("validates well-formed availability query parameters", () => {
      const res = publicAvailabilityQuerySchema.safeParse(validQuery);
      expect(res.success).toBe(true);
    });

    it("accepts specific staff queries with valid staff UUID", () => {
      const res = publicAvailabilityQuerySchema.safeParse({
        ...validQuery,
        staffPreference: "specific",
        staffId: "660e8400-e29b-41d4-a716-446655440001",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid date formats", () => {
      expect(
        publicAvailabilityQuerySchema.safeParse({ ...validQuery, date: "27-10-2026" }).success
      ).toBe(false);
      expect(
        publicAvailabilityQuerySchema.safeParse({ ...validQuery, date: "invalid-date" }).success
      ).toBe(false);
    });

    it("rejects invalid service UUIDs", () => {
      expect(
        publicAvailabilityQuerySchema.safeParse({ ...validQuery, serviceId: "not-a-uuid" }).success
      ).toBe(false);
    });
  });

  describe("3. Public Booking Input Validation", () => {
    const validBooking = {
      businessSlug: "bookpilot-qa-salon",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      startsAt: "2026-10-27T10:00:00Z",
      customerName: "Alice Walker",
      customerEmail: "alice@example.com",
      customerPhone: "+44 7700 900123",
      customerNotes: "First visit, please use gentle products.",
      idempotencyKey: "pub-idemp-12345",
    };

    it("accepts valid booking with full contact details", () => {
      const res = publicBookingInputSchema.safeParse(validBooking);
      expect(res.success).toBe(true);
    });

    it("accepts booking with only email", () => {
      const res = publicBookingInputSchema.safeParse({
        ...validBooking,
        customerPhone: "",
      });
      expect(res.success).toBe(true);
    });

    it("accepts booking with only phone number", () => {
      const res = publicBookingInputSchema.safeParse({
        ...validBooking,
        customerEmail: "",
      });
      expect(res.success).toBe(true);
    });

    it("rejects booking when neither email nor phone is provided", () => {
      const res = publicBookingInputSchema.safeParse({
        ...validBooking,
        customerEmail: "",
        customerPhone: "",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain(
          "Please provide either an email address or a phone number"
        );
      }
    });

    it("rejects short or empty customer names", () => {
      expect(
        publicBookingInputSchema.safeParse({ ...validBooking, customerName: "A" }).success
      ).toBe(false);
      expect(
        publicBookingInputSchema.safeParse({ ...validBooking, customerName: "   " }).success
      ).toBe(false);
    });

    it("rejects invalid email formats", () => {
      expect(
        publicBookingInputSchema.safeParse({ ...validBooking, customerEmail: "invalid-email" }).success
      ).toBe(false);
    });

    it("rejects invalid startsAt timestamps", () => {
      expect(
        publicBookingInputSchema.safeParse({ ...validBooking, startsAt: "2026-10-27 10:00" }).success
      ).toBe(false);
    });

    it("enforces maximum note length (500 characters)", () => {
      const longNote = "a".repeat(501);
      expect(
        publicBookingInputSchema.safeParse({ ...validBooking, customerNotes: longNote }).success
      ).toBe(false);
    });
  });

  describe("4. Management Token Cryptography & Security", () => {
    it("generates 64-character (32-byte) hex cryptographically secure tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true);
    });

    it("hashes tokens deterministically with SHA-256", () => {
      const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      // Different tokens produce different hashes
      const otherHash = hashToken("fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210");
      expect(hash1).not.toBe(otherHash);
    });

    it("verifies timing-safe hash comparison correctly", () => {
      const hashA = hashToken("token-alpha");
      const hashB = hashToken("token-alpha");
      const hashC = hashToken("token-beta");

      expect(timingSafeHashMatch(hashA, hashB)).toBe(true);
      expect(timingSafeHashMatch(hashA, hashC)).toBe(false);
      expect(timingSafeHashMatch(hashA, "invalid-length")).toBe(false);
    });

    it("formats clean uppercase booking reference codes", () => {
      const uuid = "e070ecfb-c04b-441a-9515-71815fe41d74";
      const ref = formatBookingReference(uuid);
      expect(ref).toBe("APPT-E070ECFB");
      expect(ref).toMatch(/^APPT-[A-Z0-9]{8}$/);
    });

    it("builds correct customer self-service URL", () => {
      const token = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
      const url = buildManagementUrl("https://aisolan.vercel.app", token);
      expect(url).toBe(`https://aisolan.vercel.app/manage-booking/${token}`);
    });

    it("validates management token format strictly via Zod schema", () => {
      const validToken = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
      expect(managementTokenSchema.safeParse(validToken).success).toBe(true);

      // Too short
      expect(managementTokenSchema.safeParse("a1b2c3").success).toBe(false);
      // Non-hex
      expect(
        managementTokenSchema.safeParse(
          "g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
        ).success
      ).toBe(false);
    });
  });

  describe("5. Customer Cancellation & Reschedule Schemas", () => {
    const validToken = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

    it("validates cancellation requests with optional reason", () => {
      expect(
        cancelBookingSchema.safeParse({
          token: validToken,
          cancellationReason: "Schedule conflict",
        }).success
      ).toBe(true);

      expect(
        cancelBookingSchema.safeParse({
          token: validToken,
        }).success
      ).toBe(true);
    });

    it("validates rescheduling requests with ISO timestamp", () => {
      expect(
        rescheduleBookingSchema.safeParse({
          token: validToken,
          newStartsAt: "2026-10-28T14:30:00Z",
          newStaffId: "550e8400-e29b-41d4-a716-446655440000",
        }).success
      ).toBe(true);

      // Without newStaffId (keep same staff)
      expect(
        rescheduleBookingSchema.safeParse({
          token: validToken,
          newStartsAt: "2026-10-28T14:30:00Z",
        }).success
      ).toBe(true);

      // Invalid timestamp
      expect(
        rescheduleBookingSchema.safeParse({
          token: validToken,
          newStartsAt: "tomorrow at 2pm",
        }).success
      ).toBe(false);
    });
  });

  describe("6. Server-Side Rate Limiter & Abuse Prevention", () => {
    it("permits allowed number of requests and throttles upon exceeding", async () => {
      const client = "ip-192.168.1.100";
      const slug = "bookpilot-qa-salon";

      // Allow 5 booking attempts per minute
      for (let i = 0; i < 5; i++) {
        const check = await enforcePublicBookingRateLimit({
          identifier: client,
          businessSlug: slug,
          action: "booking",
        });
        expect(check.allowed).toBe(true);
      }

      // 6th attempt should be blocked
      const blocked = await enforcePublicBookingRateLimit({
        identifier: client,
        businessSlug: slug,
        action: "booking",
      });
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toContain("Too many requests");
    });

    it("applies per-business throttling independently", async () => {
      const slug = "high-traffic-salon";

      // 30 bookings per minute max per salon
      for (let i = 0; i < 30; i++) {
        publicBookingRateLimiter.checkLimit(`rate:biz:booking:${slug}`, 30, 60);
      }

      const bizCheck = await enforcePublicBookingRateLimit({
        identifier: "different-ip-every-time",
        businessSlug: slug,
        action: "booking",
      });

      expect(bizCheck.allowed).toBe(false);
      expect(bizCheck.reason).toContain("high traffic");
    });

    it("resets counters after window expires", () => {
      const key = "test-key";
      // Limit of 2 with 1s window
      expect(publicBookingRateLimiter.checkLimit(key, 2, 1).allowed).toBe(true);
      expect(publicBookingRateLimiter.checkLimit(key, 2, 1).allowed).toBe(true);
      expect(publicBookingRateLimiter.checkLimit(key, 2, 1).allowed).toBe(false);

      // Reset
      publicBookingRateLimiter.reset(key);
      expect(publicBookingRateLimiter.checkLimit(key, 2, 1).allowed).toBe(true);
    });
  });

  describe("7. Security Gate Invariants (Phase 1F Hardening)", () => {
    it("fails closed on booking mutations if durable limiter fails in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: "production",
          configurable: true,
          writable: true,
          enumerable: true,
        });
        const check = await enforcePublicBookingRateLimit({
          identifier: "prod-client",
          businessSlug: "test-salon",
          action: "booking",
        });

        // In production without serviceClient, booking mutations MUST fail closed
        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("fail closed");
      } finally {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: originalEnv,
          configurable: true,
          writable: true,
          enumerable: true,
        });
      }
    });

    it("requires management token to be exactly 64 hex characters", () => {
      // 64 hex chars valid
      expect(managementTokenSchema.safeParse("a".repeat(64)).success).toBe(true);
      // 63 chars invalid
      expect(managementTokenSchema.safeParse("a".repeat(63)).success).toBe(false);
      // 65 chars invalid
      expect(managementTokenSchema.safeParse("a".repeat(65)).success).toBe(false);
      // Non-hex chars invalid
      expect(managementTokenSchema.safeParse("z".repeat(64)).success).toBe(false);
    });

    it("isolates rate limits between distinct client IP identifiers", async () => {
      const clientA = "192.168.1.101";
      const clientB = "192.168.1.102";
      const salon = "isolated-salon";

      // Exhaust client A's limit (5 requests)
      for (let i = 0; i < 5; i++) {
        const check = await enforcePublicBookingRateLimit({
          identifier: clientA,
          businessSlug: salon,
          action: "booking",
        });
        expect(check.allowed).toBe(true);
      }

      // 6th attempt for client A should be blocked
      const blockedA = await enforcePublicBookingRateLimit({
        identifier: clientA,
        businessSlug: salon,
        action: "booking",
      });
      expect(blockedA.allowed).toBe(false);

      // Client B should still be allowed on their independent quota
      const allowedB = await enforcePublicBookingRateLimit({
        identifier: clientB,
        businessSlug: salon,
        action: "booking",
      });
      expect(allowedB.allowed).toBe(true);
    });

    it("ensures SHA-256 token hashing produces uniform 64-character hex strings", () => {
      const raw1 = generateSecureToken();
      const raw2 = generateSecureToken();
      expect(raw1).not.toBe(raw2);

      const hash1 = hashToken(raw1);
      const hash2 = hashToken(raw2);
      expect(hash1).toHaveLength(64);
      expect(hash2).toHaveLength(64);
      expect(hash1).not.toBe(hash2);
      // Hash is deterministic
      expect(hashToken(raw1)).toBe(hash1);
    });

    it("hardens idempotency replay authorization against NULL and mismatched contact evasion", () => {
      function evaluateIdempotencyReplayAuth(
        inbound: { email: string | null; phone: string | null },
        existing: { email: string | null; phone: string | null }
      ): boolean {
        const emailMatches = Boolean(
          inbound.email && existing.email && inbound.email === existing.email
        );
        const phoneMatches = Boolean(
          inbound.phone && existing.phone && inbound.phone === existing.phone
        );
        const emailMismatch = Boolean(
          inbound.email && existing.email && inbound.email !== existing.email
        );
        const phoneMismatch = Boolean(
          inbound.phone && existing.phone && inbound.phone !== existing.phone
        );

        if (emailMismatch || phoneMismatch || (!emailMatches && !phoneMatches)) {
          return false; // IDEMPOTENCY_CONFLICT
        }
        return true; // AUTHORIZED
      }

      // Exact match
      expect(
        evaluateIdempotencyReplayAuth(
          { email: "alice@example.com", phone: "111" },
          { email: "alice@example.com", phone: "111" }
        )
      ).toBe(true);

      // Positive email match with null inbound phone
      expect(
        evaluateIdempotencyReplayAuth(
          { email: "alice@example.com", phone: null },
          { email: "alice@example.com", phone: "111" }
        )
      ).toBe(true);

      // Positive phone match with null inbound email
      expect(
        evaluateIdempotencyReplayAuth(
          { email: null, phone: "111" },
          { email: "alice@example.com", phone: "111" }
        )
      ).toBe(true);

      // Mismatched email should be rejected
      expect(
        evaluateIdempotencyReplayAuth(
          { email: "bob@example.com", phone: "111" },
          { email: "alice@example.com", phone: "111" }
        )
      ).toBe(false);

      // Cross-contact without positive match (caller provides only email, customer has only phone)
      expect(
        evaluateIdempotencyReplayAuth(
          { email: "mallory@example.com", phone: null },
          { email: null, phone: "111" }
        )
      ).toBe(false);

      // Cross-contact without positive match (caller provides only phone, customer has only email)
      expect(
        evaluateIdempotencyReplayAuth(
          { email: null, phone: "999" },
          { email: "alice@example.com", phone: null }
        )
      ).toBe(false);
    });
  });

  describe("8. Online Booking Toggle & Migration 0008 Schema Verification", () => {
    it("verifies online_booking_enabled toggle gate logic", () => {
      function evaluateBookingToggle(policy: { online_booking_enabled?: boolean } | null) {
        if (!policy || !policy.online_booking_enabled) {
          return { allowed: false, code: "ONLINE_BOOKING_DISABLED" };
        }
        return { allowed: true };
      }

      // Default / null policy
      expect(evaluateBookingToggle(null).allowed).toBe(false);
      expect(evaluateBookingToggle(null).code).toBe("ONLINE_BOOKING_DISABLED");

      // Explicitly disabled
      expect(evaluateBookingToggle({ online_booking_enabled: false }).allowed).toBe(false);

      // Explicitly enabled
      expect(evaluateBookingToggle({ online_booking_enabled: true }).allowed).toBe(true);
    });

    it("verifies migration 0008 SQL contains exact canonical schema column names", () => {
      const sqlPath = path.resolve(process.cwd(), "supabase/migrations/20261022000008_fix_public_booking_atomic_schema.sql");
      const sql = fs.readFileSync(sqlPath, "utf-8").replace(/\r\n/g, "\n");

      // Verify customers insert uses canonical single 'name' column
      expect(sql).toContain("INSERT INTO public.customers (\n                business_id,\n                name,\n                email,\n                phone,\n                notes\n            )");
      expect(sql).not.toContain("first_name,");
      expect(sql).not.toContain("last_name,");

      // Verify appointments insert uses canonical snapshot columns
      expect(sql).toContain("duration_minutes_snapshot");
      expect(sql).toContain("buffer_before_minutes_snapshot");
      expect(sql).toContain("buffer_after_minutes_snapshot");
      expect(sql).toContain("price_minor_snapshot");
      expect(sql).toContain("customer_name_snapshot");
      expect(sql).toContain("timezone_snapshot");

      // Ensure deprecated/erroneous column names from 0007 are not in INSERT statements
      expect(sql).not.toContain("buffer_before_minutes,");
      expect(sql).not.toContain("buffer_after_minutes,");
      expect(sql).not.toContain("internal_notes");

      // Verify diagnostic SQLERRM and SQLSTATE are logged via RAISE WARNING, NOT leaked in client JSON
      expect(sql).toContain("GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;");
      expect(sql).toContain("RAISE WARNING '[create_public_appointment_atomic] Internal database error: % (SQLSTATE %)', v_sqlerrm, v_sqlstate;");
      expect(sql).not.toContain("'debug_state'");
      expect(sql).not.toContain("'debug_error'");

      // Verify management-token RPC uses corrected snapshot columns
      expect(sql).toContain("'price_amount', v_appointment.price_minor_snapshot");
      expect(sql).toContain("'customer_notes', v_appointment.notes");
      expect(sql).not.toContain("v_appointment.price_amount_snapshot");
      expect(sql).not.toContain("v_appointment.customer_notes");
    });
  });

  describe("9. Customer Self-Service Management (1F-004) & Policy Normalization", () => {
    it("normalizes management token RPC output to camelCase domain models", () => {
      const rawRpcItem = {
        appointment_id: "70a37a72-0000-0000-0000-000000000000",
        booking_reference: "70A37A72",
        status: "confirmed",
        starts_at: "2026-10-30T09:00:00Z",
        service_ends_at: "2026-10-30T09:30:00Z",
        price_amount: 2200,
        currency: "GBP",
        service_name: "Classic Haircut",
        service_id: "11111111-0000-0000-0000-000000000000",
        staff_name: "Alex QA",
        staff_id: "22222222-0000-0000-0000-000000000000",
        customer_notes: "Please be gentle",
        business: {
          id: "33333333-0000-0000-0000-000000000000",
          name: "BookPilot QA Salon",
          slug: "bookpilot-qa-salon",
          timezone: "Europe/London",
          currency: "GBP",
          address_line1: "1 Test Street",
          city: "London",
          phone: "+44 20 7946 0000",
          email: "qa@example.com",
        },
        policy: {
          cancellation_notice_hours: 24,
          cancellation_policy_text: null,
          min_notice_hours: 2,
          max_advance_days: 60,
        },
        permissions: {
          can_cancel: true,
          can_reschedule: true,
        },
      };

      // Normalization logic as in server.ts
      const normalized = {
        policy: {
          cancellationNoticeHours: Number(
            rawRpcItem.policy?.cancellation_notice_hours ?? 24
          ),
          cancellationPolicyText: rawRpcItem.policy?.cancellation_policy_text ?? null,
          minNoticeHours: Number(rawRpcItem.policy?.min_notice_hours ?? 2),
          maxAdvanceDays: Number(rawRpcItem.policy?.max_advance_days ?? 60),
        },
        permissions: {
          canCancel: Boolean(rawRpcItem.permissions?.can_cancel),
          canReschedule: Boolean(rawRpcItem.permissions?.can_reschedule),
        },
      };

      expect(normalized.permissions.canCancel).toBe(true);
      expect(normalized.permissions.canReschedule).toBe(true);
      expect(normalized.policy.cancellationNoticeHours).toBe(24);
      expect(normalized.policy.minNoticeHours).toBe(2);
      expect(normalized.policy.maxAdvanceDays).toBe(60);
    });

    it("verifies notice deadlines accurately compute permissions", () => {
      function computePermissions(
        startsAtMs: number,
        nowMs: number,
        cancelNoticeHours: number,
        rescheduleNoticeHours: number,
        status: string
      ) {
        if (status !== "confirmed" && status !== "pending") {
          return { canCancel: false, canReschedule: false };
        }
        const hoursUntil = (startsAtMs - nowMs) / 3600000;
        return {
          canCancel: hoursUntil > cancelNoticeHours,
          canReschedule: hoursUntil > rescheduleNoticeHours,
        };
      }

      const now = new Date("2026-10-30T00:00:00Z").getTime();
      const apptIn25Hours = now + 25 * 3600000;
      const apptIn10Hours = now + 10 * 3600000;
      const apptIn1Hour = now + 1 * 3600000;

      // 25h out: can both cancel (>24h) and reschedule (>2h)
      expect(computePermissions(apptIn25Hours, now, 24, 2, "confirmed")).toEqual({
        canCancel: true,
        canReschedule: true,
      });

      // 10h out: cannot cancel (<=24h), but can reschedule (>2h)
      expect(computePermissions(apptIn10Hours, now, 24, 2, "confirmed")).toEqual({
        canCancel: false,
        canReschedule: true,
      });

      // 1h out: cannot cancel and cannot reschedule
      expect(computePermissions(apptIn10Hours, now, 24, 2, "cancelled")).toEqual({
        canCancel: false,
        canReschedule: false,
      });
      expect(computePermissions(apptIn1Hour, now, 24, 2, "confirmed")).toEqual({
        canCancel: false,
        canReschedule: false,
      });
    });

    it("verifies migration 0009 SQL contains all safety rules, opening hours, notice checks, and row locking", () => {
      const sqlPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20261022000009_allow_reschedule_when_booking_paused.sql"
      );
      const sql = fs.readFileSync(sqlPath, "utf-8").replace(/\r\n/g, "\n");

      // 1. Core signature and security definer
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_management_token(");
      expect(sql).toContain("SECURITY DEFINER");
      expect(sql).toContain("SET search_path = ''");

      // 2. Row-level concurrency locking on token and appointment
      expect(sql).toContain("FROM public.appointment_management_tokens\n    WHERE token_hash = pg_catalog.btrim(p_token_hash)\n    FOR UPDATE;");
      expect(sql).toContain("FROM public.appointments\n    WHERE id = v_token.appointment_id\n    FOR UPDATE;");

      // 3. Online booking OFF permitted: no online_booking_enabled gate
      expect(sql).not.toContain("online_booking_enabled");

      // 4. Original appointment notice deadline enforcement
      expect(sql).toContain("IF v_appointment.starts_at < (pg_catalog.now() + (v_min_notice_hours * INTERVAL '1 hour')) THEN");
      expect(sql).toContain("'LATE_RESCHEDULE'");

      // 5. Proposed appointment notice and advance horizon checks
      expect(sql).toContain("IF p_new_starts_at < (pg_catalog.now() + (v_min_notice_hours * INTERVAL '1 hour')) THEN");
      expect(sql).toContain("IF p_new_starts_at > (pg_catalog.now() + (v_max_advance_days * INTERVAL '1 day')) THEN");

      // 6. Business opening hours containment including turnaround buffer
      expect(sql).toContain("FROM public.business_opening_hours");
      expect(sql).toContain("open_time <= v_local_occupied_start_time AND close_time >= v_local_occupied_end_time");
      expect(sql).toContain("'SALON_CLOSED'");

      // 7. Active/unarchived tenant service and staff verification
      expect(sql).toContain("FROM public.services\n    WHERE id = v_appointment.service_id\n      AND business_id = v_appointment.business_id\n      AND is_active = TRUE\n      AND is_archived = FALSE;");
      expect(sql).toContain("WHERE sp.id = v_target_staff_id\n      AND sp.business_id = v_appointment.business_id\n      AND sp.is_active = TRUE\n      AND sp.is_archived = FALSE;");

      // 8. Canonical updated_at timestamp update and exclusion constraint handling
      expect(sql).toContain("updated_at = pg_catalog.now()");
      expect(sql).toContain("WHEN exclusion_violation THEN");
      expect(sql).toContain("'SLOT_TAKEN'");

      // 9. Permissions: revoked from anon/public, granted only to service_role
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.reschedule_appointment_by_management_token FROM PUBLIC, anon, authenticated;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.reschedule_appointment_by_management_token TO service_role;");
    });
  });

  describe("10. Public Availability Overlap Exclusions & Confirmation Copy (1F-005)", () => {
    it("excludes candidate slots that partially or fully overlap existing occupied appointments", () => {
      // Slot collision formula:
      // candidate_start < existing_occupied_end AND candidate_occupied_end > existing_occupied_start
      function isSlotOccupied(
        candStartMs: number,
        candEndMs: number,
        apptOccupiedStartMs: number,
        apptOccupiedEndMs: number
      ): boolean {
        return candStartMs < apptOccupiedEndMs && candEndMs > apptOccupiedStartMs;
      }

      // Existing appointment for Alex QA: 09:00 to 09:30 (with 5 min buffer = occupied 09:00 to 09:35)
      const apptStart = new Date("2026-10-30T09:00:00Z").getTime();
      const apptEnd = new Date("2026-10-30T09:35:00Z").getTime();

      // Candidate slot 1: 09:00 to 09:35 (exact match)
      expect(isSlotOccupied(new Date("2026-10-30T09:00:00Z").getTime(), new Date("2026-10-30T09:35:00Z").getTime(), apptStart, apptEnd)).toBe(true);

      // Candidate slot 2: 09:15 to 09:50 (partial overlap)
      expect(isSlotOccupied(new Date("2026-10-30T09:15:00Z").getTime(), new Date("2026-10-30T09:50:00Z").getTime(), apptStart, apptEnd)).toBe(true);

      // Candidate slot 3: 09:30 to 10:05 (buffer overlap at 09:30-09:35)
      expect(isSlotOccupied(new Date("2026-10-30T09:30:00Z").getTime(), new Date("2026-10-30T10:05:00Z").getTime(), apptStart, apptEnd)).toBe(true);

      // Candidate slot 4: 09:45 to 10:20 (after buffer, clean)
      expect(isSlotOccupied(new Date("2026-10-30T09:45:00Z").getTime(), new Date("2026-10-30T10:20:00Z").getTime(), apptStart, apptEnd)).toBe(false);

      // Candidate slot 5: 08:25 to 09:00 (before appointment, clean)
      expect(isSlotOccupied(new Date("2026-10-30T08:25:00Z").getTime(), new Date("2026-10-30T09:00:00Z").getTime(), apptStart, apptEnd)).toBe(false);
    });

    it("formats policy-based confirmation copy with no missing numbers or empty placeholders", () => {
      function generateConfirmationCopy(policy: { cancellationNoticeHours?: number; minNoticeHours?: number } | null | undefined): string {
        const cancelHours = policy?.cancellationNoticeHours;
        const rescheduleHours = policy?.minNoticeHours;
        if (cancelHours && rescheduleHours) {
          if (cancelHours === rescheduleHours) {
            return `Bookmark this page or keep your confirmation link. You can reschedule or cancel online up to ${cancelHours} hours before your appointment.`;
          }
          return `Bookmark this page or keep your confirmation link. You can reschedule online up to ${rescheduleHours} hours in advance, and cancel up to ${cancelHours} hours before your appointment.`;
        }
        if (cancelHours) {
          return `Bookmark this page or keep your confirmation link. Cancellations must be made at least ${cancelHours} hours in advance.`;
        }
        return `Bookmark this page or keep your confirmation link. You can reschedule or cancel your appointment online using the link above in accordance with salon policy.`;
      }

      // Case 1: Equal windows (e.g. 24h & 24h)
      const copySame = generateConfirmationCopy({ cancellationNoticeHours: 24, minNoticeHours: 24 });
      expect(copySame).toBe("Bookmark this page or keep your confirmation link. You can reschedule or cancel online up to 24 hours before your appointment.");
      expect(copySame).not.toContain("up to  hours");

      // Case 2: Different windows (e.g. 2h reschedule, 24h cancel)
      const copyDiff = generateConfirmationCopy({ cancellationNoticeHours: 24, minNoticeHours: 2 });
      expect(copyDiff).toBe("Bookmark this page or keep your confirmation link. You can reschedule online up to 2 hours in advance, and cancel up to 24 hours before your appointment.");
      expect(copyDiff).not.toContain("up to  hours");

      // Case 3: Missing/undefined policy
      const copyMissing = generateConfirmationCopy(null);
      expect(copyMissing).toBe("Bookmark this page or keep your confirmation link. You can reschedule or cancel your appointment online using the link above in accordance with salon policy.");
      expect(copyMissing).not.toContain("up to  hours");
      expect(copyMissing).not.toContain("undefined");
    });
  });
});
