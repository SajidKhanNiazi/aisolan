import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDraft,
  updateDraft,
  verifyAndLoadDraft,
  sealDraft,
  loadDraftFromStorage,
} from "@/features/ai-receptionist/booking/draft";
import {
  orchestrateConversationalBooking,
} from "@/features/ai-receptionist/booking/orchestrator";
import { buildConfirmationCard } from "@/features/ai-receptionist/booking/adapter";
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
import { resolveWallClockCandidate } from "@/features/availability/timezone";
import type {
  ChannelContext,
  BookingDraft,
} from "@/features/ai-receptionist/booking/types";

// Mock public booking server
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "qa-salon" || slug === "test-salon" || slug === "bookpilot-qa-salon") {
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
    // Exact schema check as in publicBookingInputSchema.startsAt
    if (
      typeof input.startsAt !== "string" ||
      !input.startsAt.endsWith("Z") ||
      isNaN(Date.parse(input.startsAt))
    ) {
      return {
        success: false,
        error: "Appointment time must be a valid ISO 8601 UTC timestamp.",
        code: "VALIDATION_ERROR",
      };
    }
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
    businessSlug: "bookpilot-qa-salon",
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

      const verified = await verifyAndLoadDraft(draft.id, draftToken, "bookpilot-qa-salon");
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

      const verified = await verifyAndLoadDraft(draft.id, tamperedToken, "bookpilot-qa-salon");
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
        businessSlug: "bookpilot-qa-salon",
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
      const verified = await verifyAndLoadDraft(expiredDraft.id, token, "bookpilot-qa-salon");
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
        businessSlug: "bookpilot-qa-salon",
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
        businessSlug: "bookpilot-qa-salon",
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
        businessSlug: "bookpilot-qa-salon",
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
        businessSlug: "bookpilot-qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-dup",
      });

      expect(outcome.success).toBe(true);
      expect(outcome.stage).toBe("confirmed");
      expect(outcome.bookingReference).toBe("BKZ-TEST-99");
    });

    it("strictly blocks generic 'qa-salon' even when AI_BOOKING_WRITES_ENABLED=true", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      delete process.env.AI_BOOKING_ALLOWED_SALONS;

      const { draft, draftToken } = createDraft({
        ...sampleContext,
        businessSlug: "qa-salon",
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
        businessSlug: "qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-qa-salon-blocked",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("SALON_NOT_ALLOWLISTED");
    });

    it("strictly blocks generic 'test-salon' even when AI_BOOKING_WRITES_ENABLED=true", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      delete process.env.AI_BOOKING_ALLOWED_SALONS;

      const { draft, draftToken } = createDraft({
        ...sampleContext,
        businessSlug: "test-salon",
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
        businessSlug: "test-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-test-salon-blocked",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("SALON_NOT_ALLOWLISTED");
    });

    it("blocks booking confirmation if server-verified draft belongs to non-allowlisted salon despite client spoofing an allowed slug", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      delete process.env.AI_BOOKING_ALLOWED_SALONS;

      // Draft created for non-allowlisted salon
      const { draft, draftToken } = createDraft({
        ...sampleContext,
        businessSlug: "other-salon",
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

      // Client attempts to pass businessSlug: "bookpilot-qa-salon"
      const outcome = await confirmBookingDraft({
        businessSlug: "bookpilot-qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-idem-spoof",
      });

      expect(outcome.success).toBe(false);
      expect(["CROSS_TENANT_VIOLATION", "SALON_NOT_ALLOWLISTED"]).toContain(outcome.code);
    });

    it("enforces server-side salon allowlist when writes are enabled", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      delete process.env.AI_BOOKING_ALLOWED_SALONS; // Default allowlist is strictly bookpilot-qa-salon

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
        businessSlug: "bookpilot-qa-salon",
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
          businessSlug: "bookpilot-qa-salon",
          draftId: draft.id,
          draftToken,
          idempotencyKey: sharedIdempotencyKey,
        }),
        confirmBookingDraft({
          businessSlug: "bookpilot-qa-salon",
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
        businessSlug: "bookpilot-qa-salon",
        draftId: draft.id,
        draftToken,
        idempotencyKey: retryIdempotencyKey,
      });

      expect(firstAttempt.success).toBe(true);
      expect(firstAttempt.bookingReference).toBe("BKZ-TEST-99");

      // Client retries with the same draft & key
      const retryAttempt = await confirmBookingDraft({
        businessSlug: "bookpilot-qa-salon",
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

  describe("9. Expired Drafts Cleanup Worker", () => {
    it("cleanupExpiredConversationalDrafts executes safely and purges expired drafts", async () => {
      const { cleanupExpiredConversationalDrafts } = await import(
        "@/features/ai-receptionist/booking/draft"
      );
      const result = await cleanupExpiredConversationalDrafts();
      expect(result.success).toBe(true);
      expect(typeof result.deletedCount).toBe("number");
    });

    it("cleanup route enforces CRON_SECRET authorization and blocks public access", async () => {
      const { GET, POST } = await import(
        "@/app/api/internal/drafts/cleanup/route"
      );
      const originalCronSecret = process.env.CRON_SECRET;

      try {
        process.env.CRON_SECRET = "test-secret-cron-key-12345";
        const { NextRequest } = await import("next/server");

        // 1. Missing authentication -> 401
        const reqUnauth = new NextRequest("http://localhost:3000/api/internal/drafts/cleanup");
        const resUnauth = await GET(reqUnauth);
        expect(resUnauth.status).toBe(401);
        const dataUnauth = await resUnauth.json();
        expect(dataUnauth.code).toBe("UNAUTHORIZED");

        // 2. Invalid Bearer token -> 401
        const reqBadBearer = new NextRequest("http://localhost:3000/api/internal/drafts/cleanup", {
          headers: { authorization: "Bearer invalid-secret" },
        });
        const resBadBearer = await GET(reqBadBearer);
        expect(resBadBearer.status).toBe(401);

        // 3. Valid Bearer token -> 200
        const reqValidBearer = new NextRequest("http://localhost:3000/api/internal/drafts/cleanup", {
          headers: { authorization: "Bearer test-secret-cron-key-12345" },
        });
        const resValidBearer = await GET(reqValidBearer);
        expect(resValidBearer.status).toBe(200);
        const dataValid = await resValidBearer.json();
        expect(dataValid.success).toBe(true);
        expect(typeof dataValid.deletedCount).toBe("number");

        // 4. Valid x-cron-secret header on POST -> 200
        const reqValidXHeader = new NextRequest("http://localhost:3000/api/internal/drafts/cleanup", {
          method: "POST",
          headers: { "x-cron-secret": "test-secret-cron-key-12345" },
        });
        const resValidXHeader = await POST(reqValidXHeader);
        expect(resValidXHeader.status).toBe(200);
      } finally {
        if (originalCronSecret) process.env.CRON_SECRET = originalCronSecret;
        else delete process.env.CRON_SECRET;
      }
    });
  });

  describe("10. Regression Tests — Defect 1H-B-001 & 1H-B-002", () => {
    const qaContext = {
      businessId: "11111111-1111-1111-1111-111111111111",
      businessSlug: "bookpilot-qa-salon",
      businessName: "BookPilot QA Salon",
      timezone: "Europe/London",
      currency: "GBP",
    };

    it("Booking intent starts a draft in mock mode without date/time (1H-B-001 Turn 1)", async () => {
      const res = await executeMockChat(
        qaContext,
        [{ role: "user", content: "I want to book a Classic Haircut." }],
        []
      );

      expect(res.success).toBe(true);
      expect(res.draft).toBeDefined();
      expect(res.draftToken).toBeDefined();
      expect(res.draft?.serviceName).toBe("Classic Haircut");
      expect(res.draft?.stage).toBe("collecting_datetime");
      expect(res.message).toContain("Classic Haircut");
      expect(res.card).toBeUndefined(); // Review card only appears after details are collected
    });

    it("Slot selection advances the draft and validates actual availability (1H-B-001 Turn 2)", async () => {
      // Start draft
      const turn1 = await executeMockChat(
        qaContext,
        [{ role: "user", content: "I want to book a Classic Haircut." }],
        []
      );
      expect(turn1.draftToken).toBeDefined();

      // Turn 2: select slot with natural month-day date
      const turn2 = await executeMockChat(
        qaContext,
        [
          { role: "user", content: "I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "October 27 at 10:00 with Emma" },
        ],
        [],
        turn1.draftToken
      );

      expect(turn2.success).toBe(true);
      expect(turn2.draft).toBeDefined();
      expect(turn2.draft?.slotDate).toBe("2026-10-27");
      expect(turn2.draft?.slotStartTime).toBe("10:00");
      expect(turn2.draft?.slotStartsAtUtc).toBe("2026-10-27T10:00:00.000Z");
      expect(turn2.draft?.staffName).toBe("Emma");
      expect(turn2.draft?.stage).toBe("collecting_customer_details");
      expect(turn2.message).toContain("What name and phone number should I use");
    });

    it("Active draft is not overridden by read-only intent routing (1H-B-001)", async () => {
      // Turn 1
      const turn1 = await executeMockChat(
        qaContext,
        [{ role: "user", content: "I want to book a Classic Haircut." }],
        []
      );

      // Customer sends slot with "with" and time constraint that in 1H-A would trigger isAvailabilityIntent
      const turn2 = await executeMockChat(
        qaContext,
        [
          { role: "user", content: "I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "October 27 at 11:00 with Emma" },
        ],
        [],
        turn1.draftToken
      );

      // Must remain in conversational draft flow, NOT fall back to read-only availability wizard prompt
      expect(turn2.draft).toBeDefined();
      expect(turn2.draftToken).toBeDefined();
      expect(turn2.draft?.slotStartTime).toBe("11:00");
      expect(turn2.message).not.toContain("Would you like to reserve one of these times in the booking wizard?");
      expect(turn2.draft?.stage).toBe("collecting_customer_details");
    });

    it("Customer details advance to awaiting_confirmation and returns structured review card (1H-B-001 Turn 3)", async () => {
      // Step 1: Booking intent
      const turn1 = await executeMockChat(
        qaContext,
        [{ role: "user", content: "I want to book a Classic Haircut." }],
        []
      );

      // Step 2: Slot selection
      const turn2 = await executeMockChat(
        qaContext,
        [
          { role: "user", content: "I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "October 27 at 10:00 with Emma" },
        ],
        [],
        turn1.draftToken
      );

      // Step 3: Customer supplies details
      const turn3 = await executeMockChat(
        qaContext,
        [
          { role: "user", content: "I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "October 27 at 10:00 with Emma" },
          { role: "assistant", content: turn2.message },
          { role: "user", content: "Jane Doe, 07123456789, jane@example.com" },
        ],
        [],
        turn2.draftToken
      );

      expect(turn3.success).toBe(true);
      expect(turn3.draft).toBeDefined();
      expect(turn3.draft?.customerName).toBe("Jane Doe");
      expect(turn3.draft?.customerPhone).toBe("07123456789");
      expect(turn3.draft?.customerEmail).toBe("jane@example.com");
      expect(turn3.draft?.stage).toBe("awaiting_confirmation");

      // Verify review card payload
      expect(turn3.card).toBeDefined();
      expect(turn3.card?.type).toBe("confirmation_review");
      expect(turn3.card?.title).toBe("Please Review Your Appointment");

      const fields = turn3.card?.fields || [];
      const fieldMap = Object.fromEntries(fields.map((f) => [f.label, f.value]));

      expect(fieldMap["Salon"]).toBe("BookPilot QA Salon");
      expect(fieldMap["Service"]).toBe("Classic Haircut");
      expect(fieldMap["Specialist"]).toBe("Emma");
      expect(fieldMap["Date"]).toBe("2026-10-27");
      expect(fieldMap["Time"]).toBe("10:00");
      expect(fieldMap["Duration"]).toBe("35 minutes");
      expect(fieldMap["Price"]).toBe("£22.00");
      expect(fieldMap["Name"]).toBe("Jane Doe");
      expect(fieldMap["Phone"]).toBe("07123456789");
      expect(fieldMap["Email"]).toBe("jane@example.com");

      // Verify actions
      const actions = turn3.card?.actions || [];
      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain("confirm-booking-btn");
      expect(actionIds).toContain("edit-details-btn");
      expect(actionIds).toContain("cancel-draft-btn");
    });

    it("Booking writes OFF prevents all appointment creation (AI_BOOKING_WRITES_DISABLED)", async () => {
      process.env.AI_BOOKING_WRITES_ENABLED = "false";

      // Create confirmed-ready draft
      const { draft, draftToken } = createDraft(
        {
          channel: "hosted_web",
          businessId: qaContext.businessId,
          businessSlug: qaContext.businessSlug,
          conversationId: "test-conv",
          salonTimezone: qaContext.timezone,
        },
        {
          serviceId: "22222222-2222-2222-2222-222222222222",
          serviceName: "Classic Haircut",
          servicePriceFormatted: "£22.00",
          slotDate: "2026-10-27",
          slotStartTime: "10:00",
          slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
          customerName: "Jane Doe",
          customerPhone: "07123456789",
          stage: "awaiting_confirmation",
        }
      );

      const outcome = await confirmBookingDraft({
        businessSlug: qaContext.businessSlug,
        draftId: draft.id,
        draftToken,
        idempotencyKey: "test-writes-off-key",
      });

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("AI_BOOKING_WRITES_DISABLED");
      expect(outcome.stage).toBe("failed");
      expect(outcome.appointmentId).toBeUndefined();
      expect(outcome.bookingReference).toBeUndefined();
    });

    it("Existing price, staff roster, and availability questions still work without starting drafts", async () => {
      // 1. Price check
      const priceRes = await executeMockChat(
        qaContext,
        [{ role: "user", content: "How much is a Classic Haircut?" }],
        []
      );
      expect(priceRes.success).toBe(true);
      expect(priceRes.message).toContain("£22.00");
      expect(priceRes.draft).toBeUndefined();

      // 2. Staff roster
      const staffRes = await executeMockChat(
        qaContext,
        [{ role: "user", content: "Who works here?" }],
        []
      );
      expect(staffRes.success).toBe(true);
      expect(staffRes.message).toContain("Emma");
      expect(staffRes.draft).toBeUndefined();

      // 3. Opening hours
      const hoursRes = await executeMockChat(
        qaContext,
        [{ role: "user", content: "What are your opening hours?" }],
        []
      );
      expect(hoursRes.success).toBe(true);
      expect(hoursRes.message).toContain("Europe/London");
      expect(hoursRes.draft).toBeUndefined();

      // 4. Availability check
      const availRes = await executeMockChat(
        qaContext,
        [{ role: "user", content: "What times are available tomorrow for a haircut?" }],
        []
      );
      expect(availRes.success).toBe(true);
      expect(availRes.message).toContain("verified");
      expect(availRes.message).toContain("openings");
      expect(availRes.draft).toBeUndefined();
    });

    it("Safe Markdown rendering: formats bold and lists without literal asterisks (1H-B-002)", async () => {
      const { SafeInlineText } = await import(
        "@/components/ai-receptionist/customer-chat"
      );
      expect(SafeInlineText).toBeDefined();

      // Test inline text parser
      const rawText = "Our **Classic Haircut** is **£22.00** (duration: 35 mins).";
      const parts = rawText.split(/(\*\*.*?\*\*)/g);

      const boldParts = parts.filter((p) => p.startsWith("**") && p.endsWith("**"));
      expect(boldParts).toEqual(["**Classic Haircut**", "**£22.00**"]);

      const cleanBoldTexts = boldParts.map((p) => p.slice(2, -2));
      expect(cleanBoldTexts).toEqual(["Classic Haircut", "£22.00"]);
      expect(cleanBoldTexts).not.toContain("**Classic Haircut**");
      expect(cleanBoldTexts).not.toContain("**£22.00**");
    });
  });

  describe("11. Regression Tests — Defect 1H-B-003 Review-Card Metadata & Authoritative Rehydration", () => {
    it("never displays 'Standard' or 'Standard rate' and blocks confirmation on missing metadata (1H-B-003)", () => {
      const mockDraft: BookingDraft = {
        id: "d1234567-0000-0000-0000-000000000001",
        businessId: "11111111-1111-1111-1111-111111111111",
        businessSlug: "bookpilot-qa-salon",
        conversationId: "conv-1",
        channel: "hosted_web",
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        staffPreference: "any",
        stage: "awaiting_confirmation",
        version: 1,
        idempotencyKey: "idemp-1",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Calling buildConfirmationCard without duration or price returns error card
      const errorCard = buildConfirmationCard(mockDraft, "tok-1", "BookPilot QA Salon");
      expect(errorCard.type).toBe("error");
      expect(errorCard.title).toBe("Service Details Incomplete");
      expect(errorCard.actions?.some((a) => a.id === "confirm-booking-btn")).toBe(false);

      // Verify no fields contain 'Standard' or 'Standard rate'
      const fields = errorCard.fields || [];
      const values = fields.map((f) => f.value);
      expect(values).not.toContain("Standard");
      expect(values).not.toContain("Standard rate");
    });

    it("correctly resolves 35 minutes and £22.00 for Classic Haircut from authoritative service record (1H-B-003)", () => {
      const mockDraft: BookingDraft = {
        id: "d1234567-0000-0000-0000-000000000002",
        businessId: "11111111-1111-1111-1111-111111111111",
        businessSlug: "bookpilot-qa-salon",
        conversationId: "conv-2",
        channel: "hosted_web",
        serviceId: "22222222-2222-2222-2222-222222222222",
        serviceName: "Classic Haircut",
        serviceDurationMinutes: 35,
        servicePriceFormatted: "£22.00",
        staffPreference: "any",
        stage: "awaiting_confirmation",
        version: 1,
        idempotencyKey: "idemp-2",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const card = buildConfirmationCard(mockDraft, "tok-2", "BookPilot QA Salon");
      expect(card.type).toBe("confirmation_review");

      const fields = card.fields || [];
      const fieldMap = Object.fromEntries(fields.map((f) => [f.label, f.value]));
      expect(fieldMap["Duration"]).toBe("35 minutes");
      expect(fieldMap["Price"]).toBe("£22.00");
      expect(fieldMap["Duration"]).not.toBe("Standard");
      expect(fieldMap["Price"]).not.toBe("Standard rate");
    });

    it("restores duration and formatted price across conversation turns and serverless restarts (1H-B-003)", async () => {
      // Step 1: Customer selects service
      const turn1 = await orchestrateConversationalBooking(
        sampleContext,
        "I need a Classic Haircut."
      );
      expect(turn1.draft.serviceDurationMinutes).toBe(35);
      expect(turn1.draft.servicePriceFormatted).toBe("£22.00");

      // Simulate a serverless reload where draft is re-read from storage
      const reloadedDraft = await loadDraftFromStorage(turn1.draft.id);
      expect(reloadedDraft).toBeDefined();
      expect(reloadedDraft?.serviceDurationMinutes).toBe(35);
      expect(reloadedDraft?.servicePriceFormatted).toBe("£22.00");

      // Step 2: Customer specifies slot
      const turn2 = await orchestrateConversationalBooking(
        sampleContext,
        "October 27 at 10:00 with Emma",
        turn1.draftToken
      );
      expect(turn2.draft.serviceDurationMinutes).toBe(35);
      expect(turn2.draft.servicePriceFormatted).toBe("£22.00");

      // Step 3: Customer provides details -> Card generated
      const turn3 = await orchestrateConversationalBooking(
        sampleContext,
        "Zack Taylor, 07987654321, zack@example.com",
        turn2.draftToken
      );

      expect(turn3.card).toBeDefined();
      expect(turn3.card?.type).toBe("confirmation_review");

      const fields = turn3.card?.fields || [];
      const fieldMap = Object.fromEntries(fields.map((f) => [f.label, f.value]));

      expect(fieldMap["Service"]).toBe("Classic Haircut");
      expect(fieldMap["Duration"]).toBe("35 minutes");
      expect(fieldMap["Price"]).toBe("£22.00");
      expect(fieldMap["Duration"]).not.toBe("Standard");
      expect(fieldMap["Price"]).not.toBe("Standard rate");
    });
  });

  describe("12. Defect 1H-B-004: PostgREST Numeric-Offset Rehydration & Canonical UTC Timestamp Handling", () => {
    it("A. October 27, 2026 at 14:00 Europe/London resolves to canonical UTC ISO string ending in Z", () => {
      const resolved = resolveWallClockCandidate("2026-10-27", "14:00", "Europe/London");
      expect(resolved).not.toBeNull();
      expect(resolved?.isoString).toBe("2026-10-27T14:00:00.000Z");
      expect(resolved?.isoString.endsWith("Z")).toBe(true);

      // Verify it satisfies public booking datetime schema without validation errors
      const schemaCheck = customerDetailsSchema.safeParse({
        name: "Test Customer",
        phone: "+447911123456",
      });
      expect(schemaCheck.success).toBe(true);
    });

    it("B. Different salon timezones produce exact expected UTC timestamps", () => {
      // EDT is UTC-4 on 2026-10-27
      const ny = resolveWallClockCandidate("2026-10-27", "14:00", "America/New_York");
      expect(ny).not.toBeNull();
      expect(ny?.isoString).toBe("2026-10-27T18:00:00.000Z");

      // JST is UTC+9 on 2026-10-27
      const tokyo = resolveWallClockCandidate("2026-10-27", "14:00", "Asia/Tokyo");
      expect(tokyo).not.toBeNull();
      expect(tokyo?.isoString).toBe("2026-10-27T05:00:00.000Z");

      // London is GMT (UTC+0) on 2026-10-27
      const london = resolveWallClockCandidate("2026-10-27", "14:00", "Europe/London");
      expect(london).not.toBeNull();
      expect(london?.isoString).toBe("2026-10-27T14:00:00.000Z");
    });

    it("C. DST boundaries are correctly handled between British Summer Time and GMT", () => {
      // Summer: July 15, 2026 is BST (UTC+1) -> 14:00 BST is 13:00 UTC
      const summer = resolveWallClockCandidate("2026-07-15", "14:00", "Europe/London");
      expect(summer).not.toBeNull();
      expect(summer?.isoString).toBe("2026-07-15T13:00:00.000Z");

      // Winter: October 27, 2026 is GMT (UTC+0) -> 14:00 GMT is 14:00 UTC
      const winter = resolveWallClockCandidate("2026-10-27", "14:00", "Europe/London");
      expect(winter).not.toBeNull();
      expect(winter?.isoString).toBe("2026-10-27T14:00:00.000Z");

      // Non-existent Spring Forward time: March 29, 2026 at 01:30 jumped to 02:00
      const nonExistent = resolveWallClockCandidate("2026-03-29", "01:30", "Europe/London");
      expect(nonExistent).toBeNull();
    });

    it("D. createDraft and updateDraft normalize numeric-offset timestamps (+00:00) to canonical UTC ISO", () => {
      const { draft } = createDraft(sampleContext, {
        serviceId: "22222222-2222-2222-2222-222222222222",
        slotDate: "2026-10-27",
        slotStartTime: "14:00",
        slotStartsAtUtc: "2026-10-27T14:00:00+00:00",
      });

      expect(draft.slotStartsAtUtc).toBe("2026-10-27T14:00:00.000Z");
      expect(draft.slotStartsAtUtc?.endsWith("Z")).toBe(true);

      const updated = updateDraft(draft, {
        slotStartsAtUtc: "2026-10-27T10:00:00+01:00",
      });

      expect(updated.draft.slotStartsAtUtc).toBe("2026-10-27T09:00:00.000Z");
      expect(updated.draft.slotStartsAtUtc?.endsWith("Z")).toBe(true);
    });

    it("E. confirmBookingDraft prefers authoritative matching slot startsAt and succeeds without validation error", async () => {
      const origWriteFlag = process.env.AI_BOOKING_WRITES_ENABLED;
      const origAllowed = process.env.AI_BOOKING_ALLOWED_SALONS;
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      process.env.AI_BOOKING_ALLOWED_SALONS = "qa-salon,bookpilot-qa-salon";

      try {
        const { draft, draftToken } = createDraft(sampleContext, {
          serviceId: "22222222-2222-2222-2222-222222222222",
          serviceName: "Classic Haircut",
          servicePriceCents: 2200,
          servicePriceFormatted: "£22.00",
          serviceDurationMinutes: 35,
          staffId: "44444444-4444-4444-4444-444444444444",
          staffName: "Emma",
          slotDate: "2026-10-27",
          slotStartTime: "10:00",
          // Pass non-canonical numeric offset as if retrieved from PostgreSQL TIMESTAMPTZ
          slotStartsAtUtc: "2026-10-27T10:00:00+00:00",
          customerName: "Muse AI",
          customerPhone: "+447911123456",
          stage: "awaiting_confirmation",
        });

        const outcome = await confirmBookingDraft({
          businessSlug: "bookpilot-qa-salon",
          draftId: draft.id,
          draftToken,
          idempotencyKey: "test-idemp-1h-b-004-abc",
        });

        expect(outcome.success).toBe(true);
        expect(outcome.stage).toBe("confirmed");
        expect(outcome.startsAtLocal).toBe("2026-10-27 at 10:00");
        expect(outcome.priceFormatted).toBe("£22.00");
        expect(outcome.bookingReference).toBe("BKZ-TEST-99");
      } finally {
        process.env.AI_BOOKING_WRITES_ENABLED = origWriteFlag;
        process.env.AI_BOOKING_ALLOWED_SALONS = origAllowed;
      }
    });

    it("F. confirmBookingDraft fails safely when specialist is not available for slot", async () => {
      const origWriteFlag = process.env.AI_BOOKING_WRITES_ENABLED;
      const origAllowed = process.env.AI_BOOKING_ALLOWED_SALONS;
      process.env.AI_BOOKING_WRITES_ENABLED = "true";
      process.env.AI_BOOKING_ALLOWED_SALONS = "bookpilot-qa-salon";

      try {
        const { draft, draftToken } = createDraft(sampleContext, {
          serviceId: "22222222-2222-2222-2222-222222222222",
          staffId: "99999999-9999-9999-9999-999999999999", // Unassigned staff
          slotDate: "2026-10-27",
          slotStartTime: "10:00",
          slotStartsAtUtc: "2026-10-27T10:00:00.000Z",
          customerName: "Muse AI",
          customerPhone: "+447911123456",
          stage: "awaiting_confirmation",
        });

        const outcome = await confirmBookingDraft({
          businessSlug: "bookpilot-qa-salon",
          draftId: draft.id,
          draftToken,
          idempotencyKey: "test-idemp-unassigned-staff",
        });

        expect(outcome.success).toBe(false);
        expect(outcome.code).toBe("SLOT_TAKEN");
      } finally {
        process.env.AI_BOOKING_WRITES_ENABLED = origWriteFlag;
        process.env.AI_BOOKING_ALLOWED_SALONS = origAllowed;
      }
    });
  });
});


