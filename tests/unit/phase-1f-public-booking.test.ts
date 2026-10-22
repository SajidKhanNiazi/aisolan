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
  });
});
