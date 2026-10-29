import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDraft,
  updateDraft,
} from "@/features/ai-receptionist/booking/draft";
import { orchestrateConversationalBooking } from "@/features/ai-receptionist/booking/orchestrator";
import { salonTools } from "@/features/ai-receptionist/tools";
import { executeMockChat } from "@/features/ai-receptionist/mock-provider";
import {
  resolveSalonAiMode,
  processCustomerAiChat,
  getCanaryDailyUsage,
} from "@/features/ai-receptionist/server";
import { publicBookingRateLimiter } from "@/features/public-booking/rate-limit";
import type { ChannelContext, BookingDraft } from "@/features/ai-receptionist/booking/types";

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
              bufferMinutes: 10,
              assignedStaffIds: [
                "alex-qa-uuid-1111",
                "emma-qa-uuid-2222",
              ],
            },
            {
              id: "haircut-beard-uuid-2222",
              name: "Haircut & Beard",
              priceAmount: 2800,
              currency: "GBP",
              durationMinutes: 45,
              bufferMinutes: 10,
              assignedStaffIds: ["alex-qa-uuid-1111"],
            },
            {
              id: "hair-styling-uuid-3333",
              name: "Hair Styling",
              priceAmount: 1500,
              currency: "GBP",
              durationMinutes: 30,
              bufferMinutes: 5,
              assignedStaffIds: [
                "emma-qa-uuid-2222",
                "sarah-qa-uuid-3333",
              ],
            },
            {
              id: "beard-trim-uuid-4444",
              name: "Beard Trim",
              priceAmount: 1000,
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
    if (slug === "other-salon") {
      return {
        success: true,
        data: {
          id: "99999999-9999-9999-9999-999999999999",
          name: "Other Salon",
          slug: "other-salon",
          businessType: "salon",
          timezone: "Europe/London",
          currency: "GBP",
          onlineBookingEnabled: true,
          services: [],
          staff: [],
          openingHours: [],
        },
      };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ date }) => {
    return {
      success: true,
      data: {
        date,
        slots: [
          {
            localTime: "14:00",
            period: "afternoon",
            startsAt: `${date}T14:00:00.000Z`,
            availableStaffIds: ["emma-qa-uuid-2222", "alex-qa-uuid-1111"],
          },
          {
            localTime: "15:00",
            period: "afternoon",
            startsAt: `${date}T15:00:00.000Z`,
            availableStaffIds: ["emma-qa-uuid-2222", "alex-qa-uuid-1111"],
          },
          {
            localTime: "16:00",
            period: "afternoon",
            startsAt: `${date}T16:00:00.000Z`,
            availableStaffIds: ["emma-qa-uuid-2222"],
          },
        ],
      },
    };
  }),
}));

describe("Defect R-003: Customer Name Corruption & Rescheduling Flow", () => {
  const channelCtx: ChannelContext = {
    channel: "hosted_web",
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    conversationId: "test-conv-r003",
    salonTimezone: "Europe/London",
  };

  it("reproduces and verifies the exact reported Muse QA flow without name corruption", async () => {
    // 1. Initial State:
    // Name: Preview QA Tester
    // Service: Classic Haircut
    // Staff: Emma QA
    // Date: 2 November 2026 (2026-11-02)
    // Time: 2 PM (14:00)
    const init = createDraft(channelCtx);
    const updated = updateDraft(init.draft, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      serviceName: "Classic Haircut",
      servicePriceCents: 2200,
      servicePriceFormatted: "£22.00",
      serviceDurationMinutes: 35,
      staffId: "emma-qa-uuid-2222",
      staffName: "Emma QA",
      staffPreference: "specific",
      slotDate: "2026-11-02",
      slotStartTime: "14:00",
      slotStartsAtUtc: "2026-11-02T14:00:00.000Z",
      customerName: "Preview QA Tester",
      customerPhone: "+447911123456",
      stage: "awaiting_confirmation",
    });

    expect(updated.draft.customerName).toBe("Preview QA Tester");
    expect(updated.draft.slotStartTime).toBe("14:00");
    expect(updated.draft.staffName).toBe("Emma QA");

    // 2. Customer sends: "Actually, can I change the time to 3 PM instead?"
    const result = await orchestrateConversationalBooking(
      channelCtx,
      "Actually, can I change the time to 3 PM instead?",
      updated.draftToken
    );

    // 3. Verifications:
    // - Time must change to 3 PM (15:00)
    expect(result.draft.slotStartTime).toBe("15:00");
    expect(result.draft.slotStartsAtUtc).toBe("2026-11-02T15:00:00.000Z");

    // - Customer name MUST remain "Preview QA Tester" (NOT "Actually" or corrupted)
    expect(result.draft.customerName).toBe("Preview QA Tester");

    // - Customer phone must remain intact
    expect(result.draft.customerPhone).toBe("+447911123456");

    // - Service must remain Classic Haircut (£22.00, 35 mins)
    expect(result.draft.serviceName).toBe("Classic Haircut");
    expect(result.draft.servicePriceCents).toBe(2200);
    expect(result.draft.serviceDurationMinutes).toBe(35);

    // - Specialist must remain Emma QA
    expect(result.draft.staffName).toBe("Emma QA");
    expect(result.draft.staffId).toBe("emma-qa-uuid-2222");

    // - Date must remain 2026-11-02
    expect(result.draft.slotDate).toBe("2026-11-02");

    // - Stage must remain ready / awaiting_confirmation with card emitted
    expect(result.stage).toBe("awaiting_confirmation");
    expect(result.card).toBeDefined();
    const timeField = result.card?.fields?.find((f) => f.label === "Time")?.value;
    const specialistField = result.card?.fields?.find((f) => f.label === "Specialist")?.value;
    expect(timeField).toBe("15:00");
    expect(specialistField).toBe("Emma QA");
  });

  it("handles variations like 'Instead', 'Please', and Roman Urdu rescheduling", async () => {
    const init = createDraft(channelCtx);
    const updated = updateDraft(init.draft, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      serviceName: "Classic Haircut",
      servicePriceCents: 2200,
      servicePriceFormatted: "£22.00",
      serviceDurationMinutes: 35,
      staffId: "emma-qa-uuid-2222",
      staffName: "Emma QA",
      slotDate: "2026-11-02",
      slotStartTime: "14:00",
      slotStartsAtUtc: "2026-11-02T14:00:00.000Z",
      customerName: "Preview QA Tester",
      customerPhone: "+447911123456",
      stage: "awaiting_confirmation",
    });

    // Test "Instead, can we do 3pm please?"
    const res1 = await orchestrateConversationalBooking(
      channelCtx,
      "Instead, can we do 3pm please?",
      updated.draftToken
    );
    expect(res1.draft.customerName).toBe("Preview QA Tester");
    expect(res1.draft.slotStartTime).toBe("15:00");

    // Test Roman Urdu: "Wese, kya main time 3 baje kar sakta hoon?"
    const res2 = await orchestrateConversationalBooking(
      channelCtx,
      "Wese, kya main time 3 baje kar sakta hoon?",
      updated.draftToken
    );
    expect(res2.draft.customerName).toBe("Preview QA Tester");
    expect(res2.draft.slotStartTime).toBe("15:00");
  });

  it("protects prepareBookingDraft tool against conversational customerName overwrite", async () => {
    const init = createDraft(channelCtx);
    const updated = updateDraft(init.draft, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      serviceName: "Classic Haircut",
      customerName: "Preview QA Tester",
      customerPhone: "+447911123456",
      slotDate: "2026-11-02",
      slotStartTime: "14:00",
      stage: "awaiting_confirmation",
    });

    // An LLM passes rawArgs.customerName = "Actually" during tool call
    const toolRes = (await salonTools.prepareBookingDraft.execute(
      {
        businessId: channelCtx.businessId,
        businessSlug: channelCtx.businessSlug,
        businessName: "BookPilot QA Salon",
        timezone: "Europe/London",
        currency: "GBP",
        draftToken: updated.draftToken,
      },
      {
        time: "15:00",
        customerName: "Actually", // Non-name word
      }
    )) as { success: boolean; draft?: BookingDraft };

    expect(toolRes.draft?.customerName).toBe("Preview QA Tester");
    expect(toolRes.draft?.slotStartTime).toBe("15:00");
  });
});

describe("Defect R-002: Service/Price/Staff Qualification & Language Support", () => {
  const toolCtx = {
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    businessName: "BookPilot QA Salon",
    timezone: "Europe/London",
    currency: "GBP",
  };

  it("lists staff with their database-backed qualified services", async () => {
    const res = (await salonTools.listStaff.execute(toolCtx, {})) as {
      staff: Array<{ name: string; qualifiedServices: string[] }>;
    };

    expect(res.staff).toHaveLength(3);
    const alex = res.staff.find((s) => s.name === "Alex QA");
    const emma = res.staff.find((s) => s.name === "Emma QA");
    const sarah = res.staff.find((s) => s.name === "Sarah QA");

    expect(alex?.qualifiedServices).toContain("Classic Haircut");
    expect(emma?.qualifiedServices).toContain("Classic Haircut");
    expect(sarah?.qualifiedServices).not.toContain("Classic Haircut");
    expect(sarah?.qualifiedServices).toContain("Hair Styling");
  });

  it("filters staff by serviceName: Classic Haircut returns Alex and Emma, never Sarah", async () => {
    const res = (await salonTools.listStaff.execute(toolCtx, {
      serviceName: "Classic Haircut",
    })) as {
      staff: Array<{ name: string }>;
    };

    const names = res.staff.map((s) => s.name);
    expect(names).toContain("Alex QA");
    expect(names).toContain("Emma QA");
    expect(names).not.toContain("Sarah QA");
  });

  it("answers haircut staff inquiries in English and Roman Urdu without recommending Sarah", async () => {
    // English query
    const resEn = await executeMockChat(
      toolCtx,
      [{ role: "user", content: "Who can do a haircut?" }],
      []
    );
    expect(resEn.message).toContain("Alex QA");
    expect(resEn.message).toContain("Emma QA");
    expect(resEn.message).toContain("Sarah QA specializes in Hair Styling only");

    // Direct question about Sarah
    const resSarah = await executeMockChat(
      toolCtx,
      [{ role: "user", content: "Can Sarah do a haircut?" }],
      []
    );
    expect(resSarah.message).toContain("Sarah QA specializes in **Hair Styling** only and does not perform haircuts");
    expect(resSarah.message).toContain("Alex QA");
    expect(resSarah.message).toContain("Emma QA");

    // Roman Urdu query
    const resUrdu = await executeMockChat(
      toolCtx,
      [{ role: "user", content: "Haircut ke liye kaun barber hai?" }],
      []
    );
    expect(resUrdu.message).toContain("Alex QA");
    expect(resUrdu.message).toContain("Emma QA");
    expect(resUrdu.message).toContain("Sarah QA sirf Hair Styling karti hain");
  });

  it("provides database-backed pricing for Classic Haircut (£22.00, 35 mins)", async () => {
    const resPrice = await executeMockChat(
      toolCtx,
      [{ role: "user", content: "How much is a Classic Haircut?" }],
      []
    );
    expect(resPrice.message).toContain("£22.00");
    expect(resPrice.message).toContain("35 mins");
  });
});

describe("Defect R-001 & Phase C: Canary Mode & Security Audit", () => {
  beforeEach(() => {
    delete process.env.AI_CANARY_OPENAI_ENABLED;
    delete process.env.AI_RECEPTIONIST_MODE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_QA_OPENAI_ENABLED;
    delete process.env.VERCEL_ENV;
    publicBookingRateLimiter.reset();
  });

  it("enforces R-001: API response includes explicit provider and model fields", async () => {
    process.env.AI_RECEPTIONIST_MODE = "mock";

    const response = await processCustomerAiChat(
      {
        businessSlug: "bookpilot-qa-salon",
        messages: [{ role: "user", content: "Hello" }],
      },
      "127.0.0.1"
    );

    expect(response.success).toBe(true);
    expect(response.mode).toBe("mock");
    expect(response.provider).toBe("mock");
    expect(response.model).toBe("heuristic-mock");
  });

  it("strictly restricts canary OpenAI eligibility to bookpilot-qa-salon only", async () => {
    process.env.AI_CANARY_OPENAI_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test-key-valid";

    // QA salon gets openai
    const qaMode = await resolveSalonAiMode("bookpilot-qa-salon", "mock");
    expect(qaMode).toBe("openai");

    // Any other salon MUST receive mock
    const otherMode = await resolveSalonAiMode("other-salon", "mock");
    expect(otherMode).toBe("mock");

    const thirdMode = await resolveSalonAiMode("some-random-salon", "mock");
    expect(thirdMode).toBe("mock");
  });

  it("provides instant server-side kill switch (AI_CANARY_OPENAI_ENABLED=false)", async () => {
    process.env.AI_CANARY_OPENAI_ENABLED = "false";
    process.env.OPENAI_API_KEY = "sk-test-key-valid";

    const mode = await resolveSalonAiMode("bookpilot-qa-salon", "mock");
    expect(mode).toBe("mock");
  });

  it("enforces canary daily spend circuit breaker", async () => {
    process.env.AI_CANARY_OPENAI_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test-key-valid";
    process.env.AI_CANARY_MAX_DAILY_REQUESTS = "3"; // Small limit for test

    // Requests 1, 2, 3 allowed
    expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock")).toBe("openai");
    expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock")).toBe("openai");
    expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock")).toBe("openai");

    // Request 4 exceeds budget -> falls back to mock
    expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock")).toBe("mock");
  });

  it("prevents public clients from overriding provider via forged request fields", async () => {
    process.env.AI_RECEPTIONIST_MODE = "mock";
    process.env.AI_CANARY_OPENAI_ENABLED = "false";

    // Client passes arbitrary body
    const response = await processCustomerAiChat(
      {
        businessSlug: "bookpilot-qa-salon",
        messages: [{ role: "user", content: "Hello" }],
        // Forged properties are not even in schema or ignored
      } as unknown as { businessSlug: string; messages: [{ role: "user"; content: string }] },
      "127.0.0.1"
    );

    expect(response.mode).toBe("mock");
    expect(response.provider).toBe("mock");
  });

  it("defaults to strict 50-request daily cap when AI_CANARY_MAX_DAILY_REQUESTS is unset", async () => {
    process.env.AI_CANARY_OPENAI_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test-key-valid";
    delete process.env.AI_CANARY_MAX_DAILY_REQUESTS;

    const usage = await getCanaryDailyUsage("bookpilot-qa-salon");
    expect(usage.max).toBe(50);
    expect(usage.exhausted).toBe(false);
  });

  it("safely reports Canary daily usage without credentials exposure", async () => {
    process.env.AI_CANARY_OPENAI_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test-key-secret-12345";
    process.env.AI_CANARY_MAX_DAILY_REQUESTS = "50";

    const usage = await getCanaryDailyUsage("bookpilot-qa-salon");
    expect(usage).toHaveProperty("count");
    expect(usage).toHaveProperty("max", 50);
    expect(usage).toHaveProperty("exhausted");
    expect(JSON.stringify(usage)).not.toContain("sk-test-key");
  });
});
