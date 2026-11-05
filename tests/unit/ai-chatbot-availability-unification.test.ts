import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateAvailableSlots } from "@/features/availability/engine";
import { orchestrateConversationalBooking } from "@/features/ai-receptionist/booking/orchestrator";
import { confirmBookingDraft } from "@/features/ai-receptionist/booking/confirm";
import { createDraft } from "@/features/ai-receptionist/booking/draft";
import { salonTools } from "@/features/ai-receptionist/tools";
import type { PureCalculationContext } from "@/features/availability/types";
import type { ChannelContext } from "@/features/ai-receptionist/booking/types";
import type { PublicSalonProfile } from "@/features/public-booking/types";

// =========================================================================
// TEST CONSTANTS & DATA FIXTURES (Aligned with Production Bug Scenarios)
// =========================================================================
const DANIEL_QA_ID = "77777777-7777-7777-7777-777777777777";
const EMMA_QA_ID = "44444444-4444-4444-4444-444444444444";
const SARAH_QA_ID = "66666666-6666-6666-6666-666666666666";

const SCALP_MASSAGE_ID = "d4444444-2222-3333-4444-555555555555";
const HAIR_STYLING_ID = "f8e3ea70-0aa1-4018-8f55-195feac2fb2d";

const TEST_DATE = "2026-11-04";
const TIMEZONE = "Europe/London";

// Shared Public Salon Profile Fixture
const mockProfileData: PublicSalonProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "BookPilot QA Salon",
  slug: "bookpilot-qa-salon",
  businessType: "salon",
  description: "Authoritative grooming salon.",
  addressLine1: "45 Oxford Street",
  addressLine2: null,
  city: "London",
  postalCode: "W1D 2DZ",
  country: "GB",
  phone: "+44 20 7946 0123",
  email: "qa@bookzello.com",
  website: null,
  logoUrl: null,
  timezone: TIMEZONE,
  currency: "GBP",
  onlineBookingEnabled: true,
  allowStaffSelection: true,
  cancellationPolicyText: "Free cancellation up to 24 hours prior.",
  cancellationNoticeHours: 24,
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  openingHours: [
    { dayOfWeek: 1, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 2, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 3, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" }, // Wednesday
    { dayOfWeek: 4, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 5, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 6, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
  ],
  services: [
    {
      id: SCALP_MASSAGE_ID,
      name: "Scalp Massage Therapy",
      description: "50-minute therapeutic scalp treatment",
      priceAmount: 3200,
      currency: "GBP",
      durationMinutes: 50,
      bufferMinutes: 5,
      assignedStaffIds: [DANIEL_QA_ID],
    },
    {
      id: HAIR_STYLING_ID,
      name: "Hair Styling",
      description: "30-minute bespoke styling",
      priceAmount: 1500,
      currency: "GBP",
      durationMinutes: 30,
      bufferMinutes: 5,
      assignedStaffIds: [EMMA_QA_ID, SARAH_QA_ID],
    },
  ],
  staff: [
    { id: DANIEL_QA_ID, displayName: "Daniel QA", displayOrder: 1 },
    { id: EMMA_QA_ID, displayName: "Emma QA", displayOrder: 2 },
    { id: SARAH_QA_ID, displayName: "Sarah QA", displayOrder: 3 },
  ],
};

// =========================================================================
// MOCKS FOR INTEGRATED CONVERSATIONAL TESTS
// =========================================================================
let currentSimulatedAppointments: Array<{
  id: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
}> = [
    // Booking A: Daniel QA at 10:00 on 2026-11-04 (50m + 5m buffer = 10:00 to 10:55)
    {
      id: "booking-a-c833b3f6",
      staffId: DANIEL_QA_ID,
      startsAt: "2026-11-04T10:00:00.000Z",
      endsAt: "2026-11-04T10:55:00.000Z",
    },
    // Booking B: Emma QA at 10:00 on 2026-11-04 (30m + 5m buffer = 10:00 to 10:35)
    {
      id: "booking-b-ba9dc6a7",
      staffId: EMMA_QA_ID,
      startsAt: "2026-11-04T10:00:00.000Z",
      endsAt: "2026-11-04T10:35:00.000Z",
    },
  ];

vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "bookpilot-qa-salon") {
      return { success: true, data: mockProfileData };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ businessSlug, serviceId, staffId, staffPreference, date }) => {
    if (businessSlug !== "bookpilot-qa-salon") {
      return { success: false, error: "Salon not found.", code: "BUSINESS_NOT_FOUND" };
    }
    if (date === "fail-closed-test-date") {
      return { success: false, error: "Database query timeout.", code: "TIMEOUT" };
    }

    const service = mockProfileData.services.find((s) => s.id === serviceId);
    if (!service) {
      return { success: false, error: "Service unavailable.", code: "SERVICE_UNAVAILABLE" };
    }

    // Candidate slots for 2026-11-04 (09:00 to 17:00 at 30/60 min intervals)
    const baseTimes = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
    const eligibleStaffIds = service.assignedStaffIds || [];

    const computedSlots = baseTimes.map((time) => {
      const startsAt = `${date}T${time}:00.000Z`;
      const candStartMs = new Date(startsAt).getTime();
      const candEndMs = candStartMs + (service.durationMinutes + service.bufferMinutes) * 60000;

      // Available staff for this slot
      const availableStaff = eligibleStaffIds.filter((stId) => {
        if (staffPreference === "specific" && staffId && stId !== staffId) {
          return false;
        }
        // Check collision against simulated active bookings
        const hasCollision = currentSimulatedAppointments.some((appt) => {
          if (appt.staffId !== stId) return false;
          const apptStartMs = new Date(appt.startsAt).getTime();
          const apptEndMs = new Date(appt.endsAt).getTime();
          return candStartMs < apptEndMs && candEndMs > apptStartMs;
        });
        return !hasCollision;
      });

      const isAvailable = staffPreference === "specific" && staffId
        ? availableStaff.includes(staffId)
        : availableStaff.length > 0;

      return {
        startsAt,
        serviceEndsAt: new Date(candStartMs + service.durationMinutes * 60000).toISOString(),
        localTime: time,
        period: parseInt(time, 10) < 12 ? "morning" : "afternoon",
        isAvailable,
        availableStaffIds: availableStaff,
      };
    }).filter((s) => s.isAvailable);

    return {
      success: true,
      data: {
        date,
        timezone: TIMEZONE,
        serviceId,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        staffPreference: staffPreference || (staffId ? "specific" : "any"),
        selectedStaffId: staffId || null,
        slots: computedSlots,
        totalSlotsCount: computedSlots.length,
      },
    };
  }),

  createPublicBooking: vi.fn(async (input: { serviceId: string; staffId?: string; startsAt: string }) => {
    // Prevent same-staff overlapping booking
    const candStartMs = new Date(input.startsAt).getTime();
    const service = mockProfileData.services.find((s) => s.id === input.serviceId);
    const durationMins = service?.durationMinutes || 30;
    const bufferMins = service?.bufferMinutes || 5;
    const candEndMs = candStartMs + (durationMins + bufferMins) * 60000;

    if (input.staffId) {
      const hasConflict = currentSimulatedAppointments.some((a) => {
        if (a.staffId !== input.staffId) return false;
        const apptStartMs = new Date(a.startsAt).getTime();
        const apptEndMs = new Date(a.endsAt).getTime();
        return candStartMs < apptEndMs && candEndMs > apptStartMs;
      });

      if (hasConflict) {
        return {
          success: false,
          error: "The requested timeslot is already booked for this specialist.",
          code: "SLOT_TAKEN",
        };
      }
    }

    const assignedStaffId = input.staffId || SARAH_QA_ID;
    currentSimulatedAppointments.push({
      id: `booking-${Date.now()}`,
      staffId: assignedStaffId,
      startsAt: input.startsAt,
      endsAt: new Date(candEndMs).toISOString(),
    });

    return {
      success: true,
      data: {
        appointmentId: `appt-${Date.now()}`,
        bookingReference: "CONFIRM123",
        serviceName: service?.name || "Hair Styling",
        staffName: "Sarah QA",
        businessName: "BookPilot QA Salon",
      },
    };
  }),

  enforcePublicBookingRateLimit: vi.fn(async () => ({ allowed: true })),
}));

// =========================================================================
// TEST SUITE: Cross-Channel Booking Availability & Specialist Unification
// =========================================================================
describe("BOOKZELLO — AI Chatbot & Booking Engine Availability Unification Suite", () => {
  const origEnv = { ...process.env };
  const sampleContext: ChannelContext = {
    channel: "embedded_web",
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    conversationId: "conv-qa-unification",
    salonTimezone: TIMEZONE,
  };

  beforeEach(() => {
    process.env.AI_BOOKING_WRITES_ENABLED = "true";
    process.env.AI_BOOKING_ALLOWED_SALONS = "bookpilot-qa-salon";
    // Reset simulated bookings to standard fixture
    currentSimulatedAppointments = [
      {
        id: "booking-a-c833b3f6",
        staffId: DANIEL_QA_ID,
        startsAt: "2026-11-04T10:00:00.000Z",
        endsAt: "2026-11-04T10:55:00.000Z",
      },
      {
        id: "booking-b-ba9dc6a7",
        staffId: EMMA_QA_ID,
        startsAt: "2026-11-04T10:00:00.000Z",
        endsAt: "2026-11-04T10:35:00.000Z",
      },
    ];
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  // -----------------------------------------------------------------------
  // TEST 1: Daniel QA occupied at 10:00 -> Scalp Massage unavailable
  // -----------------------------------------------------------------------
  it("1. Daniel QA occupied at 10:00 -> Scalp Massage unavailable for Daniel QA", async () => {
    const calcCtx: PureCalculationContext = {
      date: TEST_DATE,
      timezone: TIMEZONE,
      now: new Date("2026-11-01T08:00:00Z"),
      bookingPolicy: { min_notice_hours: 2, max_advance_days: 30, online_booking_enabled: true },
      service: {
        id: SCALP_MASSAGE_ID,
        name: "Scalp Massage Therapy",
        duration_minutes: 50,
        buffer_minutes: 5,
        is_active: true,
        is_archived: false,
      },
      staffMembers: [{ id: DANIEL_QA_ID, display_name: "Daniel QA", is_active: true, is_archived: false, display_order: 1 }],
      businessOpeningHours: [{ day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "18:00" }],
      businessExceptions: [],
      staffWorkingHours: [{ staff_id: DANIEL_QA_ID, day_of_week: 3, is_working: true, open_time: "09:00", close_time: "18:00" }],
      staffBreaks: [],
      staffTimeOff: [],
      existingAppointments: [
        {
          id: "booking-a-c833b3f6",
          staff_id: DANIEL_QA_ID,
          starts_at: "2026-11-04T10:00:00.000Z",
          service_ends_at: "2026-11-04T10:50:00.000Z",
          occupied_starts_at: "2026-11-04T10:00:00.000Z",
          occupied_ends_at: "2026-11-04T10:55:00.000Z",
          status: "confirmed",
        },
      ],
      staffPreference: "specific",
      selectedStaffId: DANIEL_QA_ID,
      slotIntervalMinutes: 15,
    };

    const slots = calculateAvailableSlots(calcCtx);
    const tenAmSlot = slots.find((s) => s.localTime === "10:00");
    expect(tenAmSlot).toBeUndefined();

    // Verify via AI tools
    const toolRes = (await salonTools.checkAvailability.execute(
      { ...sampleContext, businessName: "BookPilot QA Salon", timezone: TIMEZONE, currency: "GBP" },
      { serviceName: "Scalp Massage Therapy", staffName: "Daniel QA", date: TEST_DATE }
    )) as { available: boolean; suggestedSlots: Array<{ time: string }> };

    expect(toolRes.suggestedSlots.some((s) => s.time === "10:00")).toBe(false);
  });

  // -----------------------------------------------------------------------
  // TEST 2: Emma QA occupied at 10:00 (with buffer) -> Hair Styling unavailable
  // -----------------------------------------------------------------------
  it("2. Emma QA occupied at 10:00 (with buffer) -> Hair Styling unavailable for Emma QA", async () => {
    const calcCtx: PureCalculationContext = {
      date: TEST_DATE,
      timezone: TIMEZONE,
      now: new Date("2026-11-01T08:00:00Z"),
      bookingPolicy: { min_notice_hours: 2, max_advance_days: 30, online_booking_enabled: true },
      service: {
        id: HAIR_STYLING_ID,
        name: "Hair Styling",
        duration_minutes: 30,
        buffer_minutes: 5,
        is_active: true,
        is_archived: false,
      },
      staffMembers: [{ id: EMMA_QA_ID, display_name: "Emma QA", is_active: true, is_archived: false, display_order: 1 }],
      businessOpeningHours: [{ day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "18:00" }],
      businessExceptions: [],
      staffWorkingHours: [{ staff_id: EMMA_QA_ID, day_of_week: 3, is_working: true, open_time: "09:00", close_time: "18:00" }],
      staffBreaks: [],
      staffTimeOff: [],
      existingAppointments: [
        {
          id: "booking-b-ba9dc6a7",
          staff_id: EMMA_QA_ID,
          starts_at: "2026-11-04T10:00:00.000Z",
          service_ends_at: "2026-11-04T10:30:00.000Z",
          occupied_starts_at: "2026-11-04T10:00:00.000Z",
          occupied_ends_at: "2026-11-04T10:35:00.000Z",
          status: "confirmed",
        },
      ],
      staffPreference: "specific",
      selectedStaffId: EMMA_QA_ID,
      slotIntervalMinutes: 15,
    };

    const slots = calculateAvailableSlots(calcCtx);
    expect(slots.find((s) => s.localTime === "10:00")).toBeUndefined();
    // 10:15 and 10:30 are also blocked by the 30m appointment + 5m cleanup buffer (blocked until 10:35)
    expect(slots.find((s) => s.localTime === "10:15")).toBeUndefined();
    expect(slots.find((s) => s.localTime === "10:30")).toBeUndefined();
    // 10:45 is available
    expect(slots.find((s) => s.localTime === "10:45")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // TEST 3: Another eligible specialist (Sarah QA) free at 10:00
  // -----------------------------------------------------------------------
  it("3. Another eligible specialist (Sarah QA) free at 10:00 -> available under 'any specialist' or for Sarah QA specifically", async () => {
    const calcCtx: PureCalculationContext = {
      date: TEST_DATE,
      timezone: TIMEZONE,
      now: new Date("2026-11-01T08:00:00Z"),
      bookingPolicy: { min_notice_hours: 2, max_advance_days: 30, online_booking_enabled: true },
      service: {
        id: HAIR_STYLING_ID,
        name: "Hair Styling",
        duration_minutes: 30,
        buffer_minutes: 5,
        is_active: true,
        is_archived: false,
      },
      staffMembers: [
        { id: EMMA_QA_ID, display_name: "Emma QA", is_active: true, is_archived: false, display_order: 1 },
        { id: SARAH_QA_ID, display_name: "Sarah QA", is_active: true, is_archived: false, display_order: 2 },
      ],
      businessOpeningHours: [{ day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "18:00" }],
      businessExceptions: [],
      staffWorkingHours: [
        { staff_id: EMMA_QA_ID, day_of_week: 3, is_working: true, open_time: "09:00", close_time: "18:00" },
        { staff_id: SARAH_QA_ID, day_of_week: 3, is_working: true, open_time: "09:00", close_time: "18:00" },
      ],
      staffBreaks: [],
      staffTimeOff: [],
      existingAppointments: [
        {
          id: "booking-b-ba9dc6a7",
          staff_id: EMMA_QA_ID,
          starts_at: "2026-11-04T10:00:00.000Z",
          service_ends_at: "2026-11-04T10:30:00.000Z",
          occupied_starts_at: "2026-11-04T10:00:00.000Z",
          occupied_ends_at: "2026-11-04T10:35:00.000Z",
          status: "confirmed",
        },
      ],
      staffPreference: "any",
      selectedStaffId: null,
      slotIntervalMinutes: 15,
    };

    const slots = calculateAvailableSlots(calcCtx);
    const tenAmSlot = slots.find((s) => s.localTime === "10:00");
    expect(tenAmSlot).toBeDefined();
    // Only Sarah QA is available in this slot
    expect(tenAmSlot?.availableStaffIds).toEqual([SARAH_QA_ID]);

    // Query for Sarah QA specifically
    const sarahCtx = { ...calcCtx, staffPreference: "specific" as const, selectedStaffId: SARAH_QA_ID };
    const sarahSlots = calculateAvailableSlots(sarahCtx);
    expect(sarahSlots.find((s) => s.localTime === "10:00")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // TEST 4: Customer explicitly requests specialist -> preserved in draft
  // -----------------------------------------------------------------------
  it("4. Customer explicitly requests specialist -> specialist is preserved in booking draft, not replaced with 'Any Specialist'", async () => {
    const turn = await orchestrateConversationalBooking(
      sampleContext,
      "I want to book Hair Styling with Emma QA on 2026-11-04 at 14:00"
    );

    expect(turn.draft.staffPreference).toBe("specific");
    expect(turn.draft.staffId).toBe(EMMA_QA_ID);
    expect(turn.draft.staffName).toBe("Emma QA");
    expect(turn.draft.staffName).not.toBe("Any Specialist");
  });

  // -----------------------------------------------------------------------
  // TEST 5: Occupied slot cannot produce a confirmable draft for that specialist
  // -----------------------------------------------------------------------
  it("5. Occupied slot cannot produce a confirmable draft for that specialist", async () => {
    const turn = await orchestrateConversationalBooking(
      sampleContext,
      "Book Scalp Massage Therapy with Daniel QA on 2026-11-04 at 10:00"
    );

    // Draft must NOT be awaiting_confirmation or verified
    expect(turn.stage).toBe("slot_unavailable");
    expect(turn.draft.stage).toBe("slot_unavailable");
    expect(turn.draft.slotStartsAtUtc).toBeUndefined();
    expect(turn.card).toBeUndefined(); // Review confirmation card must not be presented

    // Message must explain unavailability and suggest alternatives
    expect(turn.textMessage).toMatch(/\bDaniel QA.*not available.*10:00.*2026-11-04/i);
    expect(turn.textMessage).toContain("closest available times with **Daniel QA**");
  });

  // -----------------------------------------------------------------------
  // TEST 5B: Suggests other specialist if available when requested staff is busy
  // -----------------------------------------------------------------------
  it("5b. Asks customer before switching if another specialist is available at requested time", async () => {
    const turn = await orchestrateConversationalBooking(
      sampleContext,
      "I want Hair Styling with Emma QA on 2026-11-04 at 10:00"
    );

    // Emma is busy at 10:00, but Sarah QA is free at 10:00
    expect(turn.stage).toBe("slot_unavailable");
    expect(turn.draft.stage).toBe("slot_unavailable");
    expect(turn.draft.slotStartsAtUtc).toBeUndefined();

    // Must mention that Sarah QA is available and ask before switching
    expect(turn.textMessage).toMatch(/\bEmma QA.*not available.*10:00.*2026-11-04/i);
    expect(turn.textMessage).toMatch(/Sarah QA.*available at that time/i);
    expect(turn.textMessage).toMatch(/Would you like to switch to \*\*Sarah QA\*\*, or choose another time with \*\*Emma QA\*\*\?/i);
  });

  // -----------------------------------------------------------------------
  // TEST 6: Same-staff overlapping booking rejected at confirmation
  // -----------------------------------------------------------------------
  it("6. Same-staff overlapping booking rejected at confirmation", async () => {
    const { draft, draftToken } = createDraft(sampleContext, {
      serviceId: HAIR_STYLING_ID,
      staffId: EMMA_QA_ID,
      staffPreference: "specific",
      slotDate: "2026-11-04",
      slotStartTime: "10:00",
      slotStartsAtUtc: "2026-11-04T10:00:00.000Z",
      customerName: "Test Client",
      customerPhone: "+447700900123",
      stage: "awaiting_confirmation",
    });

    const outcome = await confirmBookingDraft({
      businessSlug: "bookpilot-qa-salon",
      draftId: draft.id,
      draftToken,
      idempotencyKey: "test-same-staff-overlap",
    });

    expect(outcome.success).toBe(false);
    expect(outcome.code).toBe("SLOT_TAKEN");
    expect(outcome.appointmentId).toBeUndefined();
    expect(outcome.bookingReference).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // TEST 7: Different-staff can book simultaneously if business rules allow
  // -----------------------------------------------------------------------
  it("7. Different-staff can book simultaneously if business rules allow", async () => {
    // Emma QA is booked at 10:00 (Booking B). Sarah QA is free at 10:00.
    const { draft, draftToken } = createDraft(sampleContext, {
      serviceId: HAIR_STYLING_ID,
      staffId: SARAH_QA_ID,
      staffPreference: "specific",
      slotDate: "2026-11-04",
      slotStartTime: "10:00",
      slotStartsAtUtc: "2026-11-04T10:00:00.000Z",
      customerName: "Parallel Customer",
      customerPhone: "+447700900999",
      stage: "awaiting_confirmation",
    });

    const outcome = await confirmBookingDraft({
      businessSlug: "bookpilot-qa-salon",
      draftId: draft.id,
      draftToken,
      idempotencyKey: "test-parallel-different-staff",
    });

    expect(outcome.success).toBe(true);
    expect(outcome.code).toBeUndefined();
    expect(outcome.bookingReference).toBe("CONFIRM123");
  });

  // -----------------------------------------------------------------------
  // TEST 8: Public wizard and AI availability return 100% consistent slots
  // -----------------------------------------------------------------------
  it("8. Public wizard and AI availability return 100% consistent slots for identical params", async () => {
    const { getPublicAppointmentAvailability } = await import("@/features/public-booking/server");

    // Wizard query
    const wizardRes = await getPublicAppointmentAvailability({
      businessSlug: "bookpilot-qa-salon",
      serviceId: HAIR_STYLING_ID,
      staffId: EMMA_QA_ID,
      staffPreference: "specific",
      date: TEST_DATE,
    });

    // AI Tool query
    const aiToolRes = (await salonTools.checkAvailability.execute(
      { ...sampleContext, businessName: "BookPilot QA Salon", timezone: TIMEZONE, currency: "GBP" },
      { serviceId: HAIR_STYLING_ID, staffId: EMMA_QA_ID, date: TEST_DATE }
    )) as { available: boolean; suggestedSlots: Array<{ time: string }> };

    expect(wizardRes.success).toBe(true);
    expect(aiToolRes.available).toBe(true);

    const wizardTimes = (wizardRes.data?.slots || []).map((s) => s.localTime);
    // Both exclude 10:00
    expect(wizardTimes).not.toContain("10:00");
    expect(aiToolRes.suggestedSlots.some((s) => s.time === "10:00")).toBe(false);

    // Both include 11:00, 14:00, etc.
    expect(wizardTimes).toContain("11:00");
    expect(aiToolRes.suggestedSlots.some((s) => s.time === "11:00")).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TEST 9: Timezone and cleanup/buffer handling consistency
  // -----------------------------------------------------------------------
  it("9. Timezone and cleanup/buffer handling consistency", () => {
    const calcCtx: PureCalculationContext = {
      date: TEST_DATE,
      timezone: TIMEZONE,
      now: new Date("2026-11-01T08:00:00Z"),
      bookingPolicy: { min_notice_hours: 2, max_advance_days: 30, online_booking_enabled: true },
      service: {
        id: HAIR_STYLING_ID,
        name: "Hair Styling",
        duration_minutes: 30,
        buffer_minutes: 15, // 15-minute cleanup buffer
        is_active: true,
        is_archived: false,
      },
      staffMembers: [{ id: EMMA_QA_ID, display_name: "Emma QA", is_active: true, is_archived: false, display_order: 1 }],
      businessOpeningHours: [{ day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "18:00" }],
      businessExceptions: [],
      staffWorkingHours: [{ staff_id: EMMA_QA_ID, day_of_week: 3, is_working: true, open_time: "09:00", close_time: "18:00" }],
      staffBreaks: [],
      staffTimeOff: [],
      existingAppointments: [
        {
          id: "appt-buffer-test",
          staff_id: EMMA_QA_ID,
          starts_at: "2026-11-04T10:00:00.000Z",
          service_ends_at: "2026-11-04T10:30:00.000Z", // 30m service ends at 10:30, but buffer holds until 10:45
          occupied_starts_at: "2026-11-04T10:00:00.000Z",
          occupied_ends_at: "2026-11-04T10:45:00.000Z",
          status: "confirmed",
        },
      ],
      staffPreference: "specific",
      selectedStaffId: EMMA_QA_ID,
      slotIntervalMinutes: 15,
    };

    const slots = calculateAvailableSlots(calcCtx);
    // 10:30 cannot be booked because 15-min cleanup buffer runs until 10:45
    expect(slots.find((s) => s.localTime === "10:30")).toBeUndefined();
    // 10:45 is available
    expect(slots.find((s) => s.localTime === "10:45")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // TEST 10: Cross-tenant isolation in availability queries
  // -----------------------------------------------------------------------
  it("10. Cross-tenant isolation in availability queries", async () => {
    const { getPublicAppointmentAvailability } = await import("@/features/public-booking/server");

    // Foreign salon slug
    const foreignRes = await getPublicAppointmentAvailability({
      businessSlug: "unauthorized-foreign-salon",
      serviceId: HAIR_STYLING_ID,
      staffPreference: "any",
      date: TEST_DATE,
    });

    expect(foreignRes.success).toBe(false);
    expect(foreignRes.code).toBe("BUSINESS_NOT_FOUND");
  });

  // -----------------------------------------------------------------------
  // TEST 11: Immediate revalidation if availability changes before confirmation
  // -----------------------------------------------------------------------
  it("11. Immediate revalidation if availability changes before confirmation", async () => {
    // Customer starts draft for 11:00
    const { draft, draftToken } = createDraft(sampleContext, {
      serviceId: HAIR_STYLING_ID,
      staffId: EMMA_QA_ID,
      staffPreference: "specific",
      slotDate: TEST_DATE,
      slotStartTime: "11:00",
      slotStartsAtUtc: "2026-11-04T11:00:00.000Z",
      customerName: "Fast Customer",
      customerPhone: "+447700900111",
      stage: "awaiting_confirmation",
    });

    // In the meantime, someone else takes 11:00
    currentSimulatedAppointments.push({
      id: "competing-booking-1100",
      staffId: EMMA_QA_ID,
      startsAt: "2026-11-04T11:00:00.000Z",
      endsAt: "2026-11-04T11:35:00.000Z",
    });

    // Customer clicks Confirm
    const outcome = await confirmBookingDraft({
      businessSlug: "bookpilot-qa-salon",
      draftId: draft.id,
      draftToken,
      idempotencyKey: "test-race-revalidation",
    });

    expect(outcome.success).toBe(false);
    expect(outcome.code).toBe("SLOT_TAKEN");
    expect(outcome.stage).toBe("slot_unavailable");
  });

  // -----------------------------------------------------------------------
  // TEST 12: AI must fail-closed and not invent availability when lookup fails
  // -----------------------------------------------------------------------
  it("12. AI must fail-closed and not invent availability when lookup fails", async () => {
    // When date causes a simulated database error
    const toolRes = (await salonTools.checkAvailability.execute(
      { ...sampleContext, businessName: "BookPilot QA Salon", timezone: TIMEZONE, currency: "GBP" },
      { serviceId: HAIR_STYLING_ID, date: "fail-closed-test-date" }
    )) as { available: boolean; error: string; suggestedSlots: unknown[] };

    expect(toolRes.available).toBe(false);
    expect(toolRes.suggestedSlots).toHaveLength(0);
    expect(toolRes.error).toContain("Database query timeout.");

    // Draft preparation must also fail closed
    const draftRes = (await salonTools.prepareBookingDraft.execute(
      { ...sampleContext, businessName: "BookPilot QA Salon", timezone: TIMEZONE, currency: "GBP" },
      { serviceName: "Hair Styling", date: "fail-closed-test-date", time: "10:00" }
    )) as { success: boolean; available: boolean; error: string };

    expect(draftRes.success).toBe(false);
    expect(draftRes.available).toBe(false);
    expect(draftRes.error).toMatch(/not available/i);
  });
});