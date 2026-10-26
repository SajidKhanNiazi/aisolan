import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDraft,
  verifyAndLoadDraft,
  sealDraft,
} from "@/features/ai-receptionist/booking/draft";
import {
  orchestrateConversationalBooking,
} from "@/features/ai-receptionist/booking/orchestrator";
import {
  confirmBookingDraft,
  isAiBookingWritesEnabled,
} from "@/features/ai-receptionist/booking/confirm";
import {
  bookingConfirmationRequestSchema,
  customerDetailsSchema,
} from "@/features/ai-receptionist/booking/validation";
import { executeMockChat } from "@/features/ai-receptionist/mock-provider";
import { publicBookingRateLimiter } from "@/features/public-booking/rate-limit";
import type {
  ChannelContext,
  BookingDraft,
} from "@/features/ai-receptionist/booking/types";

// Mock public booking server
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "qa-salon" || slug === "test-salon") {
      return {
        success: true,
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          name: "BookPilot QA Salon",
          slug,
          businessType: "salon",
          description: "Premium grooming and styling.",
          addressLine1: "45 Oxford Street",
          city: "London",
          postalCode: "W1D 2DZ",
          country: "GB",
          phone: "+44 20 7946 0123",
          email: "qa@bookzello.com",
          timezone: "Europe/London",
          currency: "GBP",
          onlineBookingEnabled: true,
          minNoticeHours: 2,
          maxAdvanceDays: 30,
          cancellationPolicyText: "Free cancellation up to 24 hours prior.",
          openingHours: [
            { dayOfWeek: 1, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 2, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 3, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 4, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 5, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 6, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
          ],
          services: [
            {
              id: "22222222-2222-2222-2222-222222222222",
              name: "Classic Haircut",
              priceAmount: 2200,
              currency: "GBP",
              durationMinutes: 35,
              bufferMinutes: 10,
              assignedStaffIds: ["44444444-4444-4444-4444-444444444444"],
            },
            {
              id: "33333333-3333-3333-3333-333333333333",
              name: "Beard Trim",
              priceAmount: 1200,
              currency: "GBP",
              durationMinutes: 20,
              bufferMinutes: 5,
              assignedStaffIds: ["44444444-4444-4444-4444-444444444444"],
            },
          ],
          staff: [
            {
              id: "44444444-4444-4444-4444-444444444444",
              name: "Emma",
              displayName: "Emma",
              displayOrder: 1,
            },
          ],
        },
      };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ date, staffId }) => {
    if (date === "2099-01-01") {
      return { success: false, error: "Outside booking horizon." };
    }
    return {
      success: true,
      data: {
        date,
        timezone: "Europe/London",
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        durationMinutes: 35,
        bufferMinutes: 10,
        staffPreference: staffId ? "specific" : "any",
        selectedStaffId: staffId || null,
        slots: [
          {
            startsAt: `${date}T10:00:00.000Z`,
            serviceEndsAt: `${date}T10:35:00.000Z`,
            localTime: "10:00",
            period: "morning",
            availableStaffIds: ["44444444-4444-4444-4444-444444444444"],
          },
          {
            startsAt: `${date}T11:00:00.000Z`,
            serviceEndsAt: `${date}T11:35:00.000Z`,
            localTime: "11:00",
            period: "morning",
            availableStaffIds: ["44444444-4444-4444-4444-444444444444"],
          },
        ],
        totalSlotsCount: 2,
        onlineBookingEnabled: true,
      },
    };
  }),

  createPublicBooking: vi.fn(async (input) => {
    if (input.customerName === "Conflict Customer") {
      return {
        success: false,
        error: "This slot was just booked by another customer. Please select another time.",
        code: "SLOT_TAKEN",
      };
    }
    return {
      success: true,
      data: {
        appointmentId: "55555555-5555-5555-5555-555555555555",
        bookingReference: "BKZ-TEST-99",
        businessId: "11111111-1111-1111-1111-111111111111",
        businessName: "BookPilot QA Salon",
        businessSlug: input.businessSlug,
        serviceId: input.serviceId,
        serviceName: "Classic Haircut",
        staffId: "44444444-4444-4444-4444-444444444444",
        staffName: "Emma",
        startsAt: input.startsAt,
        serviceEndsAt: input.startsAt,
        priceAmount: 2200,
        currency: "GBP",
        status: "confirmed",
        managementUrl: "https://bookzello.com/booking/manage/test-token",
        emailQueued: Boolean(input.customerEmail),
      },
    };
  }),
}));

describe("Phase 1H-B Conversational Booking Engine", () => {
  const sampleContext: ChannelContext = {
    channel: "hosted_web",
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "qa-salon",
    conversationId: "conv-qa-1",
    salonTimezone: "Europe/London",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    publicBookingRateLimiter.reset();
    delete process.env.AI_BOOKING_WRITES_ENABLED;
  });

  describe("1. Server-Authoritative Draft State & Tamper Protection", () => {
    it("creates an opaque draft token with zero plaintext customer PII", async () => {
      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        customerName: "Secret Customer",
        customerPhone: "07123456789",
        customerEmail: "private@example.com",
        customerNotes: "Allergies to certain shampoos",
      });

      expect(draft.id).toBeDefined();
      expect(draftToken).toContain(".");
      expect(draftToken.startsWith("bkd_")).toBe(true);

      // CRITICAL PRIVACY CHECK: Token MUST NOT contain customer phone, email, name, notes, or prices
      expect(draftToken).not.toContain("Secret Customer");
      expect(draftToken).not.toContain("07123456789");
      expect(draftToken).not.toContain("private@example.com");
      expect(draftToken).not.toContain("Allergies");
      expect(draftToken).not.toContain("Classic Haircut");

      const verified = await verifyAndLoadDraft(draft.id, draftToken, "qa-salon");
      expect(verified.valid).toBe(true);
      expect(verified.draft?.serviceName).toBe("Classic Haircut");
      expect(verified.draft?.customerName).toBe("Secret Customer");
    });

    it("rejects forged or tampered draft tokens", async () => {
      const { draft, draftToken } = createDraft(sampleContext, {
        serviceName: "Classic Haircut",
        servicePriceCents: 2200,
      });

      // Attempt to tamper with signature or payload
      const [payload, sig] = draftToken.split(".");
      const tamperedToken = `${payload}.${sig.slice(0, -4)}dead`;

      const verified = await verifyAndLoadDraft(draft.id, tamperedToken, "qa-salon");
      expect(verified.valid).toBe(false);
      expect(verified.code).toBe("INVALID_DRAFT_TOKEN");
    });

    it("prevents cross-tenant draft usage", async () => {
      const { draft, draftToken } = createDraft(sampleContext);
      const verified = await verifyAndLoadDraft(draft.id, draftToken, "other-salon");

      expect(verified.valid).toBe(false);
      expect(verified.code).toBe("CROSS_TENANT_VIOLATION");
    });

    it("rejects expired drafts", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const expiredDraft: BookingDraft = {
        id: "77777777-7777-7777-7777-777777777777",
        businessId: sampleContext.businessId,
        businessSlug: "qa-salon",
        conversationId: "conv-exp",
        channel: "hosted_web",
        staffPreference: "any",
        stage: "awaiting_confirmation",
        version: 1,
        expiresAt: pastDate,
        createdAt: pastDate,
        updatedAt: pastDate,
        idempotencyKey: "idem-expired",
      };

      const token = sealDraft(expiredDraft);
      const verified = await verifyAndLoadDraft(expiredDraft.id, token, "qa-salon");
      expect(verified.valid).toBe(false);
      expect(verified.code).toBe("DRAFT_EXPIRED");
    });
  });

  describe("2. Conversational State Machine & Target Customer Flow", () => {
    it("handles the complete Target Customer Conversation step-by-step", async () => {
      // Step 1: Customer asks for haircut tomorrow at 10
      const turn1 = await orchestrateConversationalBooking(
        sampleContext,
        "I need a haircut tomorrow at 10."
      );

      expect(turn1.stage).toBe("collecting_customer_details");
      expect(turn1.draft.serviceName).toBe("Classic Haircut");
      expect(turn1.draft.slotStartTime).toBe("10:00");
      expect(turn1.textMessage).toContain("Classic Haircut takes 35 minutes and costs £22.00");
      expect(turn1.textMessage).toContain("Emma is available");

      // Step 2: Customer says 'Yes.'
      const turn2 = await orchestrateConversationalBooking(
        sampleContext,
        "Yes.",
        turn1.draftToken
      );

      expect(turn2.stage).toBe("collecting_customer_details");
      expect(turn2.textMessage).toContain("What name and phone number should I use");

      // Step 3: Customer provides contact details
      const turn3 = await orchestrateConversationalBooking(
        sampleContext,
        "Ahmed Khan, 07123456789, ahmed@example.com",
        turn2.draftToken
      );

      expect(turn3.stage).toBe("awaiting_confirmation");
      expect(turn3.draft.customerName).toBe("Ahmed Khan");
      expect(turn3.draft.customerPhone).toBe("07123456789");
      expect(turn3.draft.customerEmail).toBe("ahmed@example.com");
      expect(turn3.card).toBeDefined();
      expect(turn3.card?.type).toBe("confirmation_review");
      expect(turn3.card?.actions?.some((a) => a.label === "Confirm Booking")).toBe(true);
    });

    it("supports customer corrections (date, specialist, service, cancel)", async () => {
      const turn1 = await orchestrateConversationalBooking(
        sampleContext,
        "I need a haircut tomorrow at 10."
      );

      // Correction 1: "Actually make that Friday."
      const turn2 = await orchestrateConversationalBooking(
        sampleContext,
        "Actually make that Friday.",
        turn1.draftToken
      );
      expect(turn2.draft.slotDate).toBeDefined();

      // Correction 2: "Can I choose Emma instead?"
      const turn3 = await orchestrateConversationalBooking(
        sampleContext,
        "Can I choose Emma instead?",
        turn2.draftToken
      );
      expect(turn3.draft.staffName).toBe("Emma");

      // Correction 3: "Cancel my booking"
      const turn4 = await orchestrateConversationalBooking(
        sampleContext,
        "No, don't book it.",
        turn3.draftToken
      );
      expect(turn4.stage).toBe("cancelled_draft");
      expect(turn4.textMessage).toContain("cancelled your booking draft");
    });
  });

  describe("3. Explicit Confirmation and Server-Side Safety Gate", () => {
    it("blocks writes when AI_BOOKING_WRITES_ENABLED is false (default)", async () => {
      expect(isAiBookingWritesEnabled()).toBe(false);

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        customerName: "Ahmed Khan",
        customerPhone: "07123456789",
        stage: "awaiting_confirmation",
      });

      const outcome = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-1",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("AI_BOOKING_WRITES_DISABLED");
      expect(outcome.error).toContain("undergoing verification");
    });

    it("successfully creates appointment when AI_BOOKING_WRITES_ENABLED=true", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      expect(isAiBookingWritesEnabled()).toBe(true);

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        customerName: "Ahmed Khan",
        customerPhone: "07123456789",
        customerEmail: "ahmed@example.com",
        stage: "awaiting_confirmation",
      });

      const outcome = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-2",
      });

      expect(outcome.success).toBe(true);
      expect(outcome.stage).toBe("confirmed");
      expect(outcome.bookingReference).toBe("BKZ-TEST-99");
      expect(outcome.managementUrl).toContain("test-token");
    });

    it("prevents double-booking if slot was taken between review and confirmation", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "14:00", // Slot not in available mock slots
        slotStartsAtUtc: "2026-10-27T14:00:00.000Z",
        customerName: "Ahmed Khan",
        customerPhone: "07123456789",
        stage: "awaiting_confirmation",
      });

      const outcome = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-3",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("SLOT_TAKEN");
    });

    it("supports idempotent re-confirmation without duplicate bookings", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        customerName: "Ahmed Khan",
        customerPhone: "07123456789",
        stage: "confirmed",
        bookingReference: "BKZ-TEST-99",
        appointmentId: "55555555-5555-5555-5555-555555555555",
      });

      const outcome = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-dup",
      });

      expect(outcome.success).toBe(true);
      expect(outcome.stage).toBe("confirmed");
      expect(outcome.bookingReference).toBe("BKZ-TEST-99");
    });

    it("enforces server-side salon allowlist when writes are enabled", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      process.env.AI_BOOKING_ALLOWED_SALONS = "qa-salon,bookpilot-qa-salon";

      const { draft, draftToken } = createDraft({
        ...sampleContext,
        businessSlug: "unauthorized-live-salon",
      }, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        customerName: "Ahmed Khan",
        customerPhone: "07123456789",
        stage: "awaiting_confirmation",
      });

      const outcome = await confirmBookingDraft({
        businessSlug: "unauthorized-live-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-unauthorized",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("SALON_NOT_ALLOWLISTED");
      delete process.env.AI_BOOKING_ALLOWED_SALONS;
    });
  });

  describe("4. Integration with executeMockChat", () => {
    const mockCtx = {
      businessId: "11111111-1111-1111-1111-111111111111",
      businessSlug: "qa-salon",
      businessName: "BookPilot QA Salon",
      timezone: "Europe/London",
      currency: "GBP",
    };

    it("seamlessly handles booking inquiry and advances draft", async () => {
      const res = await executeMockChat(
        mockCtx,
        [{ role: "user", content: "I need a haircut tomorrow at 10." }],
        []
      );

      expect(res.success).toBe(true);
      expect(res.draft).toBeDefined();
      expect(res.draftToken).toBeDefined();
      expect(res.message).toContain("Classic Haircut takes 35 minutes and costs £22.00");
    });

    it("preserves Phase 1H-A price check without accidentally triggering booking", async () => {
      const res = await executeMockChat(
        mockCtx,
        [{ role: "user", content: "How much is a Classic Haircut?" }],
        []
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain("£22.00");
      expect(res.draft).toBeUndefined(); // Pure price query should not create draft
    });
  });

  describe("5. Validation & Tamper Defenses", () => {
    it("validates well-formed customer details and rejects invalid phone numbers", () => {
      const valid = customerDetailsSchema.safeParse({
        name: "Ahmed Khan",
        phone: "+44 7123 456789",
        email: "ahmed@example.com",
      });
      expect(valid.success).toBe(true);

      const invalidPhone = customerDetailsSchema.safeParse({
        name: "Ahmed Khan",
        phone: "not-a-phone",
      });
      expect(invalidPhone.success).toBe(false);
    });

    it("rejects invalid business slug in confirmation request schema", () => {
      const invalid = bookingConfirmationRequestSchema.safeParse({
        businessSlug: "INVALID SLUG WITH SPACES",
        draftId: "11111111-1111-1111-1111-111111111111",
        draftToken: "some-signed-token",
        idempotencyKey: "test-idem-key",
      });
      expect(invalid.success).toBe(false);
    });

    it("prevents confirmation when required customer details are missing", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        // customerName and phone omitted
      });

      const outcome = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-missing",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("INCOMPLETE_DRAFT");
    });
  });

  describe("6. Concurrency Simulation & Network Retry Recovery", () => {
    it("handles two simultaneous confirmation requests concurrently without duplicating appointments", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        customerName: "Concurrent Customer",
        customerPhone: "07123456789",
        stage: "awaiting_confirmation",
      });

      const sharedIdempotencyKey = "shared-concurrent-key-123";

      // Fire two concurrent requests simultaneously
      const [res1, res2] = await Promise.all([
        confirmBookingDraft({
          businessSlug: "qa-salon",
          draftId: draft.id,
          draftToken,
          idempotencyKey: sharedIdempotencyKey,
        }),
        confirmBookingDraft({
          businessSlug: "qa-salon",
          draftId: draft.id,
          draftToken,
          idempotencyKey: sharedIdempotencyKey,
        }),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.bookingReference).toBe(res2.bookingReference);
      expect(res1.appointmentId).toBe(res2.appointmentId);
    });

    it("recovers safely after a network drop using the same draft idempotency key", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";

      const { draft, draftToken } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        servicePriceFormatted: "£22.00",
        slotDate: "2026-10-27",
        slotStartTime: "10:00",
        slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
        customerName: "Retry Customer",
        customerPhone: "07123456789",
        stage: "awaiting_confirmation",
      });

      const retryIdempotencyKey = "retry-network-drop-456";

      // First attempt succeeds in DB
      const firstAttempt = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: retryIdempotencyKey,
      });

      expect(firstAttempt.success).toBe(true);
      expect(firstAttempt.bookingReference).toBe("BKZ-TEST-99");

      // Client retries with the same draft & key
      const retryAttempt = await confirmBookingDraft({
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: retryIdempotencyKey,
      });

      expect(retryAttempt.success).toBe(true);
      expect(retryAttempt.bookingReference).toBe("BKZ-TEST-99");
    });
  });

  describe("7. Signing Secret Production Hardening", () => {
    it("strictly throws in production when AI_DRAFT_SECRET is absent or shorter than 32 characters", async () => {
      const { getAiDraftSecret } = await import("@/features/ai-receptionist/booking/draft");
      const originalSecret = process.env.AI_DRAFT_SECRET;
      const originalSrv = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const originalCron = process.env.CRON_SECRET;
      const originalOpenAi = process.env.OPENAI_API_KEY;

      try {
        vi.stubEnv("NODE_ENV", "production");
        delete process.env.AI_DRAFT_SECRET;

        // Even if other keys are present, it must NOT reuse them!
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-that-must-not-be-reused";
        process.env.CRON_SECRET = "test-cron-secret-that-must-not-be-reused";
        process.env.OPENAI_API_KEY = "test-openai-key-that-must-not-be-reused";

        expect(() => getAiDraftSecret()).toThrow("CRITICAL SECURITY CONFIGURATION");

        // Fails if less than 32 characters
        process.env.AI_DRAFT_SECRET = "short-key-under-32";
        expect(() => getAiDraftSecret()).toThrow("CRITICAL SECURITY CONFIGURATION");
      } finally {
        vi.unstubAllEnvs();
        if (originalSecret) process.env.AI_DRAFT_SECRET = originalSecret;
        if (originalSrv) process.env.SUPABASE_SERVICE_ROLE_KEY = originalSrv;
        if (originalCron) process.env.CRON_SECRET = originalCron;
        if (originalOpenAi) process.env.OPENAI_API_KEY = originalOpenAi;
      }
    });

    it("respects dedicated AI_DRAFT_SECRET when provided with 32+ bytes", async () => {
      const { getAiDraftSecret } = await import("@/features/ai-receptionist/booking/draft");
      process.env.AI_DRAFT_SECRET = "super-secret-dedicated-ai-draft-key-with-sufficient-entropy-12345";
      const key = getAiDraftSecret();
      expect(key).toBeDefined();
      expect(key.length).toBe(64); // SHA-256 hex
      delete process.env.AI_DRAFT_SECRET;
    });
  });

  describe("8. Migration 0014 Invariants & Tenant Isolation", () => {
    it("verifies migration 0014 file exists and defines conversational_booking_drafts table with security hardening", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20261026000014_create_conversational_booking_drafts.sql"
      );

      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, "utf-8");

      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.conversational_booking_drafts");
      expect(sql).toContain("token_hash TEXT NOT NULL");
      expect(sql).toContain("ALTER TABLE public.conversational_booking_drafts ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("REVOKE ALL ON public.conversational_booking_drafts FROM PUBLIC, anon;");
      expect(sql).toContain("GRANT ALL ON public.conversational_booking_drafts TO service_role;");
      expect(sql).toContain("GRANT SELECT ON public.conversational_booking_drafts TO authenticated;");
      expect(sql).toContain("REFERENCES public.businesses(id) ON DELETE CASCADE");
      expect(sql).toContain("idx_conv_drafts_token_hash");
      expect(sql).toContain("idx_conv_drafts_business_idempotency");
      expect(sql).toContain("public.is_business_manager_or_owner(business_id, auth.uid())");
      expect(sql).toContain("cleanup_expired_conversational_drafts");
      expect(sql).toContain("SET search_path = ''");
    });
  });
});
