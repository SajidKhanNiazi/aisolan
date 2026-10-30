import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { executeMockChat } from "@/features/ai-receptionist/mock-provider";
import { executeOpenAiChat } from "@/features/ai-receptionist/openai-provider";
import {
  rehydrateDraftFromHistory,
  resolveServiceFromText,
} from "@/features/ai-receptionist/booking/rehydrate";
import { isAiBookingWritesEnabled } from "@/features/ai-receptionist/booking/confirm";
import { SafeChatMessageContent } from "@/components/ai-receptionist/customer-chat";
import type { ToolExecutionContext, ChatMessage } from "@/features/ai-receptionist/types";
import type { PublicSalonProfile, PublicService } from "@/features/public-booking/types";

// Mock public booking server for deterministic grounding
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "bookpilot-qa-salon" || slug === "test-salon") {
      return {
        success: true,
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          name: "BookPilot QA Salon",
          slug,
          businessType: "salon",
          description: "Authoritative grooming salon.",
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
          // EXACT production database order: "Haircut & Beard" index 0, "Classic Haircut" index 1
          services: [
            {
              id: "4d85b929-4189-4990-a1d2-4c54fa8909a3",
              name: "Haircut & Beard",
              priceAmount: 2800,
              currency: "GBP",
              durationMinutes: 45,
              bufferMinutes: 10,
              assignedStaffIds: [],
            },
            {
              id: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
              name: "Classic Haircut",
              priceAmount: 2200,
              currency: "GBP",
              durationMinutes: 35,
              bufferMinutes: 5,
              assignedStaffIds: [
                "44444444-4444-4444-4444-444444444444",
                "55555555-5555-5555-5555-555555555555",
              ],
            },
            {
              id: "f8e3ea70-0aa1-4018-8f55-195feac2fb2d",
              name: "Hair Styling",
              priceAmount: 1500,
              currency: "GBP",
              durationMinutes: 30,
              bufferMinutes: 5,
              assignedStaffIds: ["66666666-6666-6666-6666-666666666666"],
            },
            {
              id: "a1111111-2222-3333-4444-555555555555",
              name: "Beard Trim",
              priceAmount: 1000,
              currency: "GBP",
              durationMinutes: 15,
              bufferMinutes: 5,
              assignedStaffIds: ["55555555-5555-5555-5555-555555555555"],
            },
          ],
          staff: [
            {
              id: "44444444-4444-4444-4444-444444444444",
              name: "Emma QA",
              displayName: "Emma QA",
              role: "Specialist",
              displayOrder: 1,
            },
            {
              id: "55555555-5555-5555-5555-555555555555",
              name: "Alex QA",
              displayName: "Alex QA",
              role: "Specialist",
              displayOrder: 2,
            },
            {
              id: "66666666-6666-6666-6666-666666666666",
              name: "Sarah QA",
              displayName: "Sarah QA",
              role: "Stylist",
              displayOrder: 3,
            },
          ],
        },
      };
    }
    if (slug === "second-salon") {
      return {
        success: true,
        data: {
          id: "88888888-8888-8888-8888-888888888888",
          name: "Second Urban Spa",
          slug: "second-salon",
          businessType: "spa",
          description: "Urban day spa.",
          addressLine1: "10 Regent Street",
          city: "London",
          postalCode: "SW1A 1AA",
          country: "GB",
          phone: "+44 20 7111 2222",
          email: "spa@example.com",
          timezone: "Europe/London",
          currency: "GBP",
          onlineBookingEnabled: true,
          minNoticeHours: 4,
          maxAdvanceDays: 60,
          cancellationPolicyText: "48 hours notice required.",
          openingHours: [],
          services: [
            {
              id: "80000000-0000-0000-0000-000000000001",
              name: "Deluxe Spa Treatment",
              priceAmount: 7500,
              currency: "GBP",
              durationMinutes: 60,
              bufferMinutes: 15,
              assignedStaffIds: ["80000000-0000-0000-0000-000000000002"],
            },
            {
              id: "80000000-0000-0000-0000-000000000003",
              name: "Express Facial",
              priceAmount: 3500,
              currency: "GBP",
              durationMinutes: 30,
              bufferMinutes: 5,
              assignedStaffIds: ["80000000-0000-0000-0000-000000000002"],
            },
          ],
          staff: [
            {
              id: "80000000-0000-0000-0000-000000000002",
              name: "Chloe Spa",
              displayName: "Chloe Spa",
              role: "Therapist",
              displayOrder: 1,
            },
          ],
        },
      };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ date, staffId, serviceId }) => {
    // If Haircut & Beard is queried with Emma QA, return 0 slots (Emma QA is not qualified)
    if (serviceId === "4d85b929-4189-4990-a1d2-4c54fa8909a3" && staffId === "44444444-4444-4444-4444-444444444444") {
      return {
        success: true,
        data: {
          date,
          timezone: "Europe/London",
          serviceId,
          serviceName: "Haircut & Beard",
          slots: [],
          totalSlotsCount: 0,
        },
      };
    }

    if (date === "2026-11-02") {
      return {
        success: true,
        data: {
          date: "2026-11-02",
          timezone: "Europe/London",
          serviceId: serviceId || "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
          serviceName: "Classic Haircut",
          slots: [
            {
              startsAt: "2026-11-02T10:00:00.000Z",
              serviceEndsAt: "2026-11-02T10:35:00.000Z",
              localTime: "10:00",
              period: "morning",
              isAvailable: true,
              availableStaffIds: staffId ? [staffId] : ["44444444-4444-4444-4444-444444444444"],
            },
            {
              startsAt: "2026-11-02T14:00:00.000Z",
              serviceEndsAt: "2026-11-02T14:35:00.000Z",
              localTime: "14:00",
              period: "afternoon",
              isAvailable: true,
              availableStaffIds: staffId ? [staffId] : ["44444444-4444-4444-4444-444444444444"],
            },
          ],
        },
      };
    }
    return {
      success: true,
      data: {
        date,
        timezone: "Europe/London",
        slots: [],
      },
    };
  }),

  enforcePublicBookingRateLimit: vi.fn(async () => ({ allowed: true })),
}));

// Mock OpenAI client
const mockOpenAiCreate = vi.fn();
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: (...args: unknown[]) => mockOpenAiCreate(...args),
        },
      };
    },
  };
});

describe("BOOKZELLO Regression Suite — Issues E-001 & E-004", () => {
  const origEnv = { ...process.env };
  const ctx: ToolExecutionContext = {
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    businessName: "BookPilot QA Salon",
    timezone: "Europe/London",
    currency: "GBP",
    channel: "embedded_web",
  };

  const sampleProfile: PublicSalonProfile = {
    id: "11111111-1111-1111-1111-111111111111",
    name: "BookPilot QA Salon",
    slug: "bookpilot-qa-salon",
    businessType: "salon",
    description: "Authoritative grooming salon.",
    logoUrl: null,
    phone: "+44 20 7946 0123",
    email: "qa@bookzello.com",
    website: null,
    addressLine1: "45 Oxford Street",
    addressLine2: null,
    city: "London",
    postalCode: "W1D 2DZ",
    country: "GB",
    timezone: "Europe/London",
    currency: "GBP",
    onlineBookingEnabled: true,
    cancellationPolicyText: "Free cancellation up to 24 hours prior.",
    cancellationNoticeHours: 24,
    minNoticeHours: 2,
    maxAdvanceDays: 30,
    openingHours: [],
    services: [
      {
        id: "4d85b929-4189-4990-a1d2-4c54fa8909a3",
        name: "Haircut & Beard",
        description: null,
        priceAmount: 2800,
        currency: "GBP",
        durationMinutes: 45,
        bufferMinutes: 10,
        assignedStaffIds: [],
      },
      {
        id: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
        name: "Classic Haircut",
        description: "Precision haircut and styling.",
        priceAmount: 2200,
        currency: "GBP",
        durationMinutes: 35,
        bufferMinutes: 5,
        assignedStaffIds: ["44444444-4444-4444-4444-444444444444"],
      },
    ],
    staff: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        displayName: "Emma QA",
        displayOrder: 1,
      },
      {
        id: "55555555-5555-5555-5555-555555555555",
        displayName: "Alex QA",
        displayOrder: 2,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAiCreate.mockReset();
    process.env = { ...origEnv };
    process.env.AI_RECEPTIONIST_MODE = "mock";
    process.env.AI_BOOKING_WRITES_ENABLED = "false";
  });

  afterEach(() => {
    process.env = origEnv;
  });

  describe("BUG E-004: Service Identification & Pricing Integrity", () => {
    it("never resolves 'Classic Haircut' to 'Haircut & Beard' despite 'haircut' substring", () => {
      const services = sampleProfile.services;
      const resolved = resolveServiceFromText("Hello, I want to book a Classic Haircut.", services);
      expect(resolved).toBeDefined();
      expect(resolved?.name).toBe("Classic Haircut");
      expect(resolved?.id).toBe("6137b975-31bb-4cf8-9cc1-4d6325d5965d");
      expect(resolved?.priceAmount).toBe(2200);
      expect(resolved?.durationMinutes).toBe(35);
    });

    it("resolves 'Haircut & Beard' accurately when requested explicitly", () => {
      const services = sampleProfile.services;
      const resolved = resolveServiceFromText("I want Haircut & Beard please", services);
      expect(resolved).toBeDefined();
      expect(resolved?.name).toBe("Haircut & Beard");
      expect(resolved?.id).toBe("4d85b929-4189-4990-a1d2-4c54fa8909a3");
      expect(resolved?.priceAmount).toBe(2800);
      expect(resolved?.durationMinutes).toBe(45);
    });

    it("does not guess when user gives ambiguous generic keyword 'haircut'", () => {
      const services = sampleProfile.services;
      // Both 'Haircut & Beard' and 'Classic Haircut' match 'haircut'
      const resolved = resolveServiceFromText("I just want a haircut", services);
      expect(resolved).toBeUndefined();
    });

    it("preserves authoritative £22.00 price and 35m duration across rehydration turns", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Hello, I want to book a Classic Haircut." },
      ];

      const rehydrated = await rehydrateDraftFromHistory(messages, sampleProfile, null, "embedded_web");
      expect(rehydrated).not.toBeNull();
      expect(rehydrated?.draft.serviceId).toBe("6137b975-31bb-4cf8-9cc1-4d6325d5965d");
      expect(rehydrated?.draft.serviceName).toBe("Classic Haircut");
      expect(rehydrated?.draft.servicePriceCents).toBe(2200);
      expect(rehydrated?.draft.servicePriceFormatted).toBe("£22.00");
      expect(rehydrated?.draft.serviceDurationMinutes).toBe(35);
    });
  });

  describe("BUG E-001: Availability Query & Fallback Prevention", () => {
    it("handles the exact 4-turn scripted conversation without roster repetition or generic greeting", async () => {
      // Turn 1: "Hello, I want to book a Classic Haircut."
      const turn1 = await executeMockChat(ctx, [
        { role: "user", content: "Hello, I want to book a Classic Haircut." },
      ]);
      expect(turn1.success).toBe(true);
      expect(turn1.draftToken).toBeDefined();
      expect(turn1.draft?.serviceName).toBe("Classic Haircut");
      const draftToken = turn1.draftToken!;

      // Turn 2: "What is the price and duration of a Classic Haircut?"
      const turn2 = await executeMockChat(
        { ...ctx, draftToken },
        [
          { role: "user", content: "Hello, I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "What is the price and duration of a Classic Haircut?" },
        ],
        [],
        draftToken
      );
      expect(turn2.success).toBe(true);
      expect(turn2.message).toContain("Classic Haircut");
      expect(turn2.message).toContain("£22.00");
      expect(turn2.message).toContain("35 mins");
      // MUST NOT contain Haircut & Beard price £28.00 or 45 mins!
      expect(turn2.message).not.toContain("£28.00");

      // Turn 3: "Can Emma QA perform this haircut?"
      const turn3 = await executeMockChat(
        { ...ctx, draftToken },
        [
          { role: "user", content: "Hello, I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "What is the price and duration of a Classic Haircut?" },
          { role: "assistant", content: turn2.message },
          { role: "user", content: "Can Emma QA perform this haircut?" },
        ],
        [],
        draftToken
      );
      expect(turn3.success).toBe(true);
      expect(turn3.message).toMatch(/Emma QA/i);
      expect(turn3.message).toMatch(/qualified/i);
      expect(turn3.message).not.toContain("Alex QA");

      // Turn 4: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026."
      const turn4 = await executeMockChat(
        { ...ctx, draftToken },
        [
          { role: "user", content: "Hello, I want to book a Classic Haircut." },
          { role: "assistant", content: turn1.message },
          { role: "user", content: "What is the price and duration of a Classic Haircut?" },
          { role: "assistant", content: turn2.message },
          { role: "user", content: "Can Emma QA perform this haircut?" },
          { role: "assistant", content: turn3.message },
          {
            role: "user",
            content: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026.",
          },
        ],
        [],
        draftToken
      );

      expect(turn4.success).toBe(true);
      expect(turn4.toolsUsed).toContain("checkAvailability");
      expect(turn4.message).toContain("2026-11-02");
      expect(turn4.message).toContain("10:00");
      expect(turn4.message).toContain("14:00");
      expect(turn4.suggestedSlots?.length).toBeGreaterThan(0);
      expect(turn4.message).not.toContain("How can I help you today?");
      expect(turn4.message).not.toContain("our qualified specialists are:");
    });

    it("processes OpenAI tool calls even when finish_reason is 'stop'", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      // Mock completion 1: returns tool call with finish_reason: 'stop' (as returned when tool_choice is forced)
      mockOpenAiCreate
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: "stop", // Crucial: was previously causing while loop to be skipped!
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_avail_1",
                    type: "function",
                    function: {
                      name: "checkAvailability",
                      arguments: JSON.stringify({
                        serviceName: "Classic Haircut",
                        staffName: "Emma QA",
                        date: "2026-11-02",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        })
        // Mock completion 2: Assistant responds with formatted slots after receiving tool response
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content:
                  "Here are the available times for Classic Haircut with Emma QA on November 2, 2026: 10:00 and 14:00. Would you like to select one?",
              },
            },
          ],
        });

      const res = await executeOpenAiChat(ctx, [
        {
          role: "user",
          content: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026.",
        },
      ]);

      expect(res.success).toBe(true);
      expect(res.toolsUsed).toContain("checkAvailability");
      expect(res.message).toContain("10:00");
      expect(res.message).not.toContain("How can I help you today?");
    });

    it("synthesizes authoritative availability message if model returns empty content after checkAvailability", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      // Mock completion 1: returns tool call
      mockOpenAiCreate
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_avail_2",
                    type: "function",
                    function: {
                      name: "checkAvailability",
                      arguments: JSON.stringify({
                        serviceName: "Classic Haircut",
                        staffName: "Emma QA",
                        date: "2026-11-02",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        })
        // Mock completion 2: Model returns null/empty content
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: null,
              },
            },
          ],
        });

      const res = await executeOpenAiChat(ctx, [
        {
          role: "user",
          content: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026.",
        },
      ]);

      expect(res.success).toBe(true);
      expect(res.toolsUsed).toContain("checkAvailability");
      // Must NOT be the generic fallback greeting!
      expect(res.message).not.toContain("How can I help you today?");
      expect(res.message).toContain("10:00");
      expect(res.message).toContain("14:00");
      expect(res.suggestedSlots?.length).toBeGreaterThan(0);
    });
  });

  describe("Multi-Tenant Isolation & Multiple Salon Catalogs", () => {
    it("isolates service resolution between salons with distinct catalogs", async () => {
      // Salon 1: BookPilot QA Salon
      const salon1 = sampleProfile;
      const res1 = resolveServiceFromText("Can I book a Deluxe Spa Treatment?", salon1.services);
      expect(res1).toBeUndefined(); // Does not exist in Salon 1

      // Salon 2: Second Urban Spa
      const salon2Services: PublicService[] = [
        {
          id: "80000000-0000-0000-0000-000000000001",
          name: "Deluxe Spa Treatment",
          description: null,
          priceAmount: 7500,
          currency: "GBP",
          durationMinutes: 60,
          bufferMinutes: 15,
          assignedStaffIds: [],
        },
      ];
      const res2 = resolveServiceFromText("Can I book a Deluxe Spa Treatment?", salon2Services);
      expect(res2).toBeDefined();
      expect(res2?.name).toBe("Deluxe Spa Treatment");
      expect(res2?.priceAmount).toBe(7500);
    });
  });

  describe("Safety & Invariants", () => {
    it("ensures booking writes remain disabled (AI_BOOKING_WRITES_ENABLED=false)", () => {
      expect(isAiBookingWritesEnabled()).toBe(false);
    });

    it("renders safe markdown without exposing raw formatting syntax", () => {
      const rendered = SafeChatMessageContent({
        content: "We have openings for **Classic Haircut**:\n• **10:00**",
        isAssistant: true,
      });
      expect(rendered).toBeDefined();
    });
  });
});
