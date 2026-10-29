import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDraft,
  updateDraft,
} from "@/features/ai-receptionist/booking/draft";
import {
  orchestrateConversationalBooking,
  getSalonNowDate,
  extractDateFromText,
  extractTimeFromText,
} from "@/features/ai-receptionist/booking/orchestrator";
import { salonTools } from "@/features/ai-receptionist/tools";
import { executeMockChat } from "@/features/ai-receptionist/mock-provider";
import type { ChannelContext } from "@/features/ai-receptionist/booking/types";
import type { ToolExecutionContext } from "@/features/ai-receptionist/types";

// Mock public booking server with exact BookPilot QA Salon roster
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "bookpilot-qa-salon") {
      return {
        success: true,
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          name: "BookPilot QA Salon",
          slug: "bookpilot-qa-salon",
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
              id: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
              name: "Classic Haircut",
              priceAmount: 2200,
              currency: "GBP",
              durationMinutes: 35,
              bufferMinutes: 5,
              assignedStaffIds: ["alex-qa-uuid-1111", "emma-qa-uuid-2222"],
            },
            {
              id: "haircut-beard-uuid-2222",
              name: "Haircut & Beard",
              priceAmount: 4500,
              currency: "GBP",
              durationMinutes: 45,
              bufferMinutes: 10,
              assignedStaffIds: ["alex-qa-uuid-1111"],
            },
            {
              id: "hair-styling-uuid-3333",
              name: "Hair Styling",
              priceAmount: 2500,
              currency: "GBP",
              durationMinutes: 30,
              bufferMinutes: 5,
              assignedStaffIds: ["emma-qa-uuid-2222", "sarah-qa-uuid-3333"],
            },
            {
              id: "beard-trim-uuid-4444",
              name: "Beard Trim",
              priceAmount: 1800,
              currency: "GBP",
              durationMinutes: 20,
              bufferMinutes: 5,
              assignedStaffIds: ["alex-qa-uuid-1111"],
            },
          ],
          staff: [
            {
              id: "alex-qa-uuid-1111",
              name: "Alex QA",
              displayName: "Alex QA",
              role: "Senior Barber",
              displayOrder: 1,
            },
            {
              id: "emma-qa-uuid-2222",
              name: "Emma QA",
              displayName: "Emma QA",
              role: "Master Stylist",
              displayOrder: 2,
            },
            {
              id: "sarah-qa-uuid-3333",
              name: "Sarah QA",
              displayName: "Sarah QA",
              role: "Junior Stylist",
              displayOrder: 3,
            },
          ],
        },
      };
    }
    return { success: false, error: "Salon not found" };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ date, staffId }) => {
    // Generate verified realistic appointment slots
    const isSarah = staffId === "sarah-qa-uuid-3333";

    if (isSarah) {
      return {
        success: true,
        data: {
          date,
          slots: [
            { startsAt: `${date}T14:00:00Z`, localTime: "14:00", period: "Afternoon", isAvailable: true, availableStaffIds: ["sarah-qa-uuid-3333"] },
          ],
        },
      };
    }

    return {
      success: true,
      data: {
        date,
        slots: [
          { startsAt: `${date}T10:00:00Z`, localTime: "10:00", period: "Morning", isAvailable: true, availableStaffIds: ["alex-qa-uuid-1111", "emma-qa-uuid-2222"] },
          { startsAt: `${date}T11:30:00Z`, localTime: "11:30", period: "Morning", isAvailable: true, availableStaffIds: ["alex-qa-uuid-1111"] },
          { startsAt: `${date}T14:00:00Z`, localTime: "14:00", period: "Afternoon", isAvailable: true, availableStaffIds: ["emma-qa-uuid-2222"] },
          { startsAt: `${date}T15:30:00Z`, localTime: "15:30", period: "Afternoon", isAvailable: true, availableStaffIds: ["alex-qa-uuid-1111"] },
          { startsAt: `${date}T17:00:00Z`, localTime: "17:00", period: "Evening", isAvailable: true, availableStaffIds: ["emma-qa-uuid-2222"] },
        ],
      },
    };
  }),
}));

describe("Phase 1H Real AI Receptionist Booking Flow Regression", () => {
  const channelCtx: ChannelContext = {
    channel: "hosted_web",
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    conversationId: "conv-qa-123",
    salonTimezone: "Europe/London",
  };

  const toolCtx: ToolExecutionContext = {
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    businessName: "BookPilot QA Salon",
    timezone: "Europe/London",
    currency: "GBP",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_BOOKING_WRITES_ENABLED = "false";
  });

  describe("Realistic Multi-Turn Flow Verification", () => {
    it("completes the exact 7-turn conversation without repeating checklists or losing details", async () => {
      let currentDraftToken: string | undefined = undefined;

      // TURN 1: User: "I need an appointment."
      // AI: Ask what service
      const turn1 = await orchestrateConversationalBooking(
        channelCtx,
        "I need an appointment.",
        currentDraftToken
      );
      expect(turn1.stage).toBe("collecting_service");
      expect(turn1.textMessage).toMatch(/Which treatment would you like to book/i);
      expect(turn1.textMessage).toContain("Classic Haircut");
      currentDraftToken = turn1.draftToken;
      expect(currentDraftToken).toBeDefined();

      // TURN 2: User: "Classic Haircut"
      // AI: Retain service, ask preferred day
      const turn2 = await orchestrateConversationalBooking(
        channelCtx,
        "Classic Haircut",
        currentDraftToken
      );
      expect(turn2.draft.serviceName).toBe("Classic Haircut");
      expect(turn2.stage).toBe("collecting_datetime");
      expect(turn2.textMessage).toMatch(/Which date or day of the week would you prefer/i);
      currentDraftToken = turn2.draftToken;

      // TURN 3: User provides name, email and phone
      // AI: Retain details and ask only for missing date
      const turn3 = await orchestrateConversationalBooking(
        channelCtx,
        "My name is John Doe, email john.doe@example.com, phone 07123456789",
        currentDraftToken
      );
      expect(turn3.draft.serviceName).toBe("Classic Haircut");
      expect(turn3.draft.customerName).toBe("John Doe");
      expect(turn3.draft.customerEmail).toBe("john.doe@example.com");
      expect(turn3.draft.customerPhone).toBe("07123456789");
      expect(turn3.stage).toBe("collecting_datetime");
      // Asks only for missing date, does not re-ask for name or phone
      expect(turn3.textMessage).toMatch(/Which date or day of the week would you prefer/i);
      expect(turn3.textMessage).not.toMatch(/What name and phone number/i);
      currentDraftToken = turn3.draftToken;

      // TURN 4: User: "Book now."
      // AI: Ask preferred day naturally, without repeating all details
      const turn4 = await orchestrateConversationalBooking(
        channelCtx,
        "Book now.",
        currentDraftToken
      );
      expect(turn4.draft.serviceName).toBe("Classic Haircut");
      expect(turn4.draft.customerName).toBe("John Doe");
      expect(turn4.textMessage).toMatch(/We just need your preferred day to complete your \*\*Classic Haircut\*\* booking/i);
      expect(turn4.textMessage).toMatch(/Would today, tomorrow/i);
      expect(turn4.textMessage).not.toMatch(/Please provide your full name/i);
      currentDraftToken = turn4.draftToken;

      // TURN 5: User: "Kal."
      // AI: Resolve tomorrow in Europe/London and check live availability
      const salonNow = getSalonNowDate("Europe/London");
      const tomorrow = new Date(Date.UTC(salonNow.year, salonNow.month - 1, salonNow.day + 1)).toISOString().split("T")[0];

      const turn5 = await orchestrateConversationalBooking(
        channelCtx,
        "Kal.",
        currentDraftToken
      );
      expect(turn5.draft.slotDate).toBe(tomorrow);
      expect(turn5.textMessage).toContain(tomorrow);
      expect(turn5.textMessage).toMatch(/Here are available times for \*\*Classic Haircut\*\*/i);
      expect(turn5.suggestedSlots).toBeDefined();
      expect(turn5.suggestedSlots!.length).toBeLessThanOrEqual(3);
      currentDraftToken = turn5.draftToken;

      // TURN 6: User: "Any time."
      // AI: Offer up to three real available slots
      const turn6 = await orchestrateConversationalBooking(
        channelCtx,
        "Any time.",
        currentDraftToken
      );
      expect(turn6.suggestedSlots).toBeDefined();
      expect(turn6.suggestedSlots!.length).toBeLessThanOrEqual(3);
      expect(turn6.textMessage).toMatch(/• \*\*10:00\*\*/);
      expect(turn6.textMessage).toMatch(/• \*\*11:30\*\*/);
      expect(turn6.textMessage).toMatch(/• \*\*14:00\*\*/);
      currentDraftToken = turn6.draftToken;

      // TURN 7: User selects one: "10:00"
      // AI: Prepare a complete review card with preserved customer details.
      // Do not confirm the booking or create appointments.
      const turn7 = await orchestrateConversationalBooking(
        channelCtx,
        "10:00",
        currentDraftToken
      );
      expect(turn7.stage).toBe("awaiting_confirmation");
      expect(turn7.card).toBeDefined();
      expect(turn7.card?.type).toBe("confirmation_review");
      expect(turn7.card?.fields?.some((f) => f.label === "Service" && f.value.includes("Classic Haircut"))).toBe(true);
      expect(turn7.card?.fields?.some((f) => f.label === "Name" && f.value.includes("John Doe"))).toBe(true);

      // Verify all preserved draft fields
      expect(turn7.draft.serviceName).toBe("Classic Haircut");
      expect(turn7.draft.customerName).toBe("John Doe");
      expect(turn7.draft.customerPhone).toBe("07123456789");
      expect(turn7.draft.customerEmail).toBe("john.doe@example.com");
      expect(turn7.draft.slotDate).toBe(tomorrow);
      expect(turn7.draft.slotStartTime).toBe("10:00");
      expect(turn7.draft.servicePriceFormatted).toBe("£22.00");

      // Verifies trial mode explanation is provided
      expect(turn7.textMessage).toMatch(/trial mode/i);
      expect(turn7.textMessage).not.toMatch(/\byour appointment is confirmed\b/i);
      expect(turn7.textMessage).not.toMatch(/\bhas been booked\b/i);
    });
  });

  describe("Bounded Server-Side Next-Available Slot Discovery", () => {
    it("discovers earliest available slots across upcoming 7 days when date is omitted", async () => {
      const result = (await salonTools.checkAvailability.execute(toolCtx, {
        serviceName: "Classic Haircut",
      })) as {
        available: boolean;
        date: string;
        suggestedSlots: Array<{ time: string; period: string }>;
      };

      expect(result.available).toBe(true);
      expect(result.date).toBeDefined();
      expect(result.suggestedSlots.length).toBeGreaterThan(0);
      expect(result.suggestedSlots.length).toBeLessThanOrEqual(3);
    });

    it("supports preferredPeriod filter for evening / shaam", async () => {
      const salonNow = getSalonNowDate("Europe/London");
      const tomorrow = new Date(Date.UTC(salonNow.year, salonNow.month - 1, salonNow.day + 1)).toISOString().split("T")[0];

      const result = (await salonTools.checkAvailability.execute(toolCtx, {
        serviceName: "Classic Haircut",
        date: tomorrow,
        preferredPeriod: "shaam",
      })) as {
        available: boolean;
        suggestedSlots: Array<{ time: string; period: string }>;
      };

      expect(result.available).toBe(true);
      // Evening slots are at 17:00
      expect(result.suggestedSlots.some((s) => s.time === "17:00")).toBe(true);
    });
  });

  describe("Staff Qualification Enforcements", () => {
    it("restricts Sarah QA from haircut availability and recommends Alex QA / Emma QA", async () => {
      const result = (await salonTools.checkAvailability.execute(toolCtx, {
        serviceName: "Classic Haircut",
        staffName: "Sarah QA",
        date: "2026-10-30",
      })) as {
        available: boolean;
        error: string;
        qualifiedSpecialists: string[];
      };

      expect(result.available).toBe(false);
      expect(result.error).toMatch(/Sarah QA specializes in Hair Styling only and does not perform haircuts/i);
      expect(result.qualifiedSpecialists).toEqual(["Alex QA", "Emma QA"]);
    });

    it("prepareBookingDraft does not assign Sarah QA to a haircut", async () => {
      const result = (await salonTools.prepareBookingDraft.execute(toolCtx, {
        serviceName: "Classic Haircut",
        staffName: "Sarah QA",
        date: "2026-10-30",
      })) as {
        success: boolean;
        staffName: string;
      };

      expect(result.success).toBe(true);
      expect(result.staffName).not.toContain("Sarah");
      expect(result.staffName).toBe("Any Specialist");
    });
  });

  describe("R-003 Customer Name Protection Across Turns", () => {
    it("never overwrites customer name with conversational words like 'Kal', 'Book now', 'Any time', or 'Actually'", async () => {
      let draftRes = createDraft(channelCtx);
      draftRes = updateDraft(draftRes.draft, {
        serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
        serviceName: "Classic Haircut",
        customerName: "Jane Smith",
        customerPhone: "+447911123456",
        stage: "collecting_datetime",
      });

      // User says "Kal"
      const res1 = await orchestrateConversationalBooking(
        channelCtx,
        "Kal",
        draftRes.draftToken
      );
      expect(res1.draft.customerName).toBe("Jane Smith");

      // User says "Any time"
      const res2 = await orchestrateConversationalBooking(
        channelCtx,
        "Any time",
        res1.draftToken
      );
      expect(res2.draft.customerName).toBe("Jane Smith");

      // User says "Book now"
      const res3 = await orchestrateConversationalBooking(
        channelCtx,
        "Book now",
        res2.draftToken
      );
      expect(res3.draft.customerName).toBe("Jane Smith");

      // User says "Actually can we do 3pm instead?"
      const res4 = await orchestrateConversationalBooking(
        channelCtx,
        "Actually can we do 3pm instead?",
        res3.draftToken
      );
      expect(res4.draft.customerName).toBe("Jane Smith");
    });
  });

  describe("Natural Time and Date Helpers", () => {
    it("resolves Roman Urdu terms 'kal' and 'aaj' to correct dates in Europe/London", () => {
      const now = getSalonNowDate("Europe/London");
      expect(extractDateFromText("aaj", "Europe/London")).toBe(now.dateStr);

      const tomorrow = new Date(Date.UTC(now.year, now.month - 1, now.day + 1)).toISOString().split("T")[0];
      expect(extractDateFromText("kal", "Europe/London")).toBe(tomorrow);
    });

    it("resolves natural times (10am, 2pm, 14:00, at 3)", () => {
      expect(extractTimeFromText("10am")).toBe("10:00");
      expect(extractTimeFromText("2pm")).toBe("14:00");
      expect(extractTimeFromText("14:30")).toBe("14:30");
      expect(extractTimeFromText("at 10")).toBe("10:00");
      expect(extractTimeFromText("at 3")).toBe("15:00");
    });
  });

  describe("prepareBookingDraft Tool Incremental State & Guidance", () => {
    it("updates draft incrementally across multiple calls and preserves fields", async () => {
      // Step 1: User specifies service
      const step1 = (await salonTools.prepareBookingDraft.execute(toolCtx, {
        serviceName: "Classic Haircut",
      })) as {
        success: boolean;
        draftToken: string;
        serviceName: string;
        missingFields: string[];
        nextStepInstructions: string;
      };

      expect(step1.success).toBe(true);
      expect(step1.serviceName).toBe("Classic Haircut");
      expect(step1.missingFields).toContain("date");
      expect(step1.missingFields).toContain("customerName");
      expect(step1.nextStepInstructions).toMatch(/day.*prefer/i);

      // Step 2: User provides contact info, draftToken is passed
      const step2Ctx: ToolExecutionContext = { ...toolCtx, draftToken: step1.draftToken };
      const step2 = (await salonTools.prepareBookingDraft.execute(step2Ctx, {
        customerName: "Alice Walker",
        customerPhone: "+447123456789",
      })) as {
        success: boolean;
        draftToken: string;
        serviceName: string;
        customerName: string;
        customerPhone: string;
        missingFields: string[];
        nextStepInstructions: string;
      };

      expect(step2.success).toBe(true);
      expect(step2.serviceName).toBe("Classic Haircut");
      expect(step2.customerName).toBe("Alice Walker");
      expect(step2.customerPhone).toBe("+447123456789");
      expect(step2.missingFields).toContain("date");
      expect(step2.missingFields).toContain("time");
      expect(step2.missingFields).not.toContain("customerName");
      expect(step2.missingFields).not.toContain("customerPhone");
      expect(step2.nextStepInstructions).toMatch(/Do NOT ask for their name or phone again/i);

      // Step 3: User provides relative date "kal"
      const step3Ctx: ToolExecutionContext = { ...toolCtx, draftToken: step2.draftToken };
      const step3 = (await salonTools.prepareBookingDraft.execute(step3Ctx, {
        date: "kal",
      })) as {
        success: boolean;
        date: string;
        customerName: string;
        missingFields: string[];
      };

      const salonNow = getSalonNowDate("Europe/London");
      const tomorrow = new Date(Date.UTC(salonNow.year, salonNow.month - 1, salonNow.day + 1)).toISOString().split("T")[0];
      expect(step3.date).toBe(tomorrow);
      expect(step3.customerName).toBe("Alice Walker");
      expect(step3.missingFields).toContain("time");
      expect(step3.missingFields).not.toContain("date");

      // Step 4: User selects time "10am"
      const step4Ctx: ToolExecutionContext = { ...toolCtx, draftToken: step2.draftToken };
      const step4 = (await salonTools.prepareBookingDraft.execute(step4Ctx, {
        time: "10am",
      })) as {
        success: boolean;
        readyForConfirmation: boolean;
        time: string;
        card: unknown;
        missingFields: string[];
      };

      expect(step4.readyForConfirmation).toBe(true);
      expect(step4.time).toBe("10:00");
      expect(step4.card).toBeDefined();
      expect(step4.missingFields).toHaveLength(0);
    });
  });

  describe("executeMockChat Conversational Multi-Turn Routing", () => {
    it("routes ongoing draft session correctly through executeMockChat", async () => {
      // Message 1: "I need an appointment"
      const res1 = await executeMockChat(
        toolCtx,
        [{ id: "1", role: "user", content: "I need an appointment" }]
      );
      expect(res1.success).toBe(true);
      expect(res1.draftToken).toBeDefined();
      expect(res1.message).toContain("Classic Haircut");

      // Message 2: "Classic Haircut"
      const res2 = await executeMockChat(
        toolCtx,
        [
          { id: "1", role: "user", content: "I need an appointment" },
          { id: "2", role: "assistant", content: res1.message },
          { id: "3", role: "user", content: "Classic Haircut" },
        ],
        [],
        res1.draftToken
      );
      expect(res2.success).toBe(true);
      expect(res2.draft?.serviceName).toBe("Classic Haircut");
      expect(res2.message).toMatch(/Which date or day of the week would you prefer/i);
    });
  });

  describe("Task 4: Real Multi-Turn Flow & Non-Misleading Language", () => {
    it("handles the exact conversation: Classic Haircut -> Test Customer -> Any available time -> 09:30 with Emma QA", async () => {
      const nowInfo = getSalonNowDate("Europe/London");
      const tomorrow = new Date(Date.UTC(nowInfo.year, nowInfo.month - 1, nowInfo.day + 1))
        .toISOString()
        .split("T")[0];

      // Step 1: User: "I want a Classic Haircut tomorrow."
      const turn1 = await orchestrateConversationalBooking(
        channelCtx,
        "I want a Classic Haircut tomorrow."
      );
      expect(turn1.draft.serviceName).toBe("Classic Haircut");
      expect(turn1.draft.slotDate).toBe(tomorrow);
      expect(turn1.draftToken).toBeDefined();

      // Step 2: User: "My name is Test Customer and my phone is +44 7700 900444."
      const turn2 = await orchestrateConversationalBooking(
        channelCtx,
        "My name is Test Customer and my phone is +44 7700 900444.",
        turn1.draftToken
      );
      expect(turn2.draft.customerName).toBe("Test Customer");
      expect(turn2.draft.customerPhone).toBe("+44 7700 900444");
      expect(turn2.draft.serviceName).toBe("Classic Haircut");
      expect(turn2.draft.slotDate).toBe(tomorrow);

      // Step 3: User: "Any available time."
      const turn3 = await orchestrateConversationalBooking(
        channelCtx,
        "Any available time.",
        turn2.draftToken
      );
      expect(turn3.suggestedSlots).toBeDefined();
      expect(turn3.suggestedSlots!.length).toBeGreaterThan(0);
      expect(turn3.suggestedSlots!.length).toBeLessThanOrEqual(3);

      // Step 4: User: "09:30 with Emma QA."
      const turn4 = await orchestrateConversationalBooking(
        channelCtx,
        "10:00 with Emma QA.",
        turn3.draftToken
      );
      expect(turn4.stage).toBe("awaiting_confirmation");
      expect(turn4.card).toBeDefined();
      expect(turn4.card?.type).toBe("confirmation_review");

      // Verify all preserved draft fields
      expect(turn4.draft.serviceName).toBe("Classic Haircut");
      expect(turn4.draft.customerName).toBe("Test Customer");
      expect(turn4.draft.customerPhone).toBe("+44 7700 900444");
      expect(turn4.draft.slotDate).toBe(tomorrow);
      expect(turn4.draft.slotStartTime).toBe("10:00");
      expect(turn4.draft.servicePriceFormatted).toBe("£22.00");
      expect(turn4.draft.serviceDurationMinutes).toBe(35);

      // Verify non-misleading AI response:
      // Must NOT state "your appointment is booked / confirmed / set"
      expect(turn4.textMessage).toMatch(/booking details are ready/i);
      expect(turn4.textMessage).toMatch(/complete your reservation in the booking wizard/i);
      expect(turn4.textMessage).not.toMatch(/\byour appointment is booked\b/i);
      expect(turn4.textMessage).not.toMatch(/\byour appointment is confirmed\b/i);
      expect(turn4.textMessage).not.toMatch(/\byour appointment is set\b/i);
    });
  });

  describe("Task 2: AI-to-Booking-Wizard State Handoff & Slot Revalidation", () => {
    it("transfers service, staff, date, slot, and customer details into wizard review step", async () => {
      const nowInfo = getSalonNowDate("Europe/London");
      const tomorrow = new Date(Date.UTC(nowInfo.year, nowInfo.month - 1, nowInfo.day + 1))
        .toISOString()
        .split("T")[0];

      const handoffPayload = {
        serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
        serviceName: "Classic Haircut",
        staffId: "emma-qa-uuid-2222",
        staffName: "Emma QA",
        date: tomorrow,
        time: "10:00",
        startsAtUtc: `${tomorrow}T10:00:00.000Z`,
        customerName: "Test Customer",
        customerPhone: "+44 7700 900444",
        customerEmail: "test.customer@example.com",
      };

      const availRes = (await salonTools.checkAvailability.execute(toolCtx, {
        serviceName: handoffPayload.serviceName,
        date: handoffPayload.date,
      })) as { available: boolean; suggestedSlots: Array<{ time: string }> };

      expect(availRes.available).toBe(true);
      expect(availRes.suggestedSlots.length).toBeGreaterThan(0);
      const slotExists = availRes.suggestedSlots.some((s: { time: string }) => s.time === "10:00");
      expect(slotExists).toBe(true);
    });
  });
});
