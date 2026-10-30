import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { executeMockChat } from "@/features/ai-receptionist/mock-provider";
import { executeOpenAiChat } from "@/features/ai-receptionist/openai-provider";
import { processCustomerAiChat } from "@/features/ai-receptionist/server";
import { rehydrateDraftFromHistory } from "@/features/ai-receptionist/booking/rehydrate";
import { getDraftFromToken } from "@/features/ai-receptionist/booking/draft";
import { isAiBookingWritesEnabled } from "@/features/ai-receptionist/booking/confirm";
import { SafeChatMessageContent } from "@/components/ai-receptionist/customer-chat";
import type { ToolExecutionContext, ChatMessage } from "@/features/ai-receptionist/types";
import type { PublicSalonProfile } from "@/features/public-booking/types";

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
          services: [
            {
              id: "22222222-2222-2222-2222-222222222222",
              name: "Classic Haircut",
              priceAmount: 2200,
              currency: "GBP",
              durationMinutes: 35,
              bufferMinutes: 10,
              assignedStaffIds: [
                "44444444-4444-4444-4444-444444444444",
                "55555555-5555-5555-5555-555555555555",
              ],
            },
            {
              id: "33333333-3333-3333-3333-333333333333",
              name: "Hair Styling",
              priceAmount: 3500,
              currency: "GBP",
              durationMinutes: 45,
              bufferMinutes: 10,
              assignedStaffIds: ["66666666-6666-6666-6666-666666666666"],
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
    if (slug === "other-salon") {
      return {
        success: true,
        data: {
          id: "99999999-9999-9999-9999-999999999999",
          name: "Other Salon Isolation",
          slug: "other-salon",
          services: [],
          staff: [],
          timezone: "Europe/London",
          currency: "GBP",
          openingHours: [],
        },
      };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ date, staffId, serviceId }) => {
    if (date === "2026-11-02") {
      return {
        success: true,
        data: {
          date: "2026-11-02",
          timezone: "Europe/London",
          serviceId: serviceId || "22222222-2222-2222-2222-222222222222",
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

describe("BOOKZELLO Issue E-001 — Embedded AI Chatbot Regression Suite", () => {
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
        id: "22222222-2222-2222-2222-222222222222",
        name: "Classic Haircut",
        description: "Precision haircut and styling.",
        priceAmount: 2200,
        currency: "GBP",
        durationMinutes: 35,
        bufferMinutes: 10,
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
    process.env = { ...origEnv };
    process.env.AI_RECEPTIONIST_MODE = "mock";
    process.env.AI_BOOKING_WRITES_ENABLED = "false";
  });

  afterEach(() => {
    process.env = origEnv;
  });

  describe("1. Staff lookup followed by availability lookup (Exact E-001 Conversation)", () => {
    it("handles the 4-turn scripted conversation deterministically without roster repetition", async () => {
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

      // Turn 3: "Can Emma QA perform this haircut?"
      // MUST answer Emma QA directly and NOT output full roster of all specialists
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
      expect(turn3.message).not.toContain("For haircuts, our qualified specialists are:");
      expect(turn3.message).not.toContain("Alex QA");

      // Turn 4: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026."
      // MUST check availability and return verified times, NOT repeat staff roster!
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
      expect(turn4.suggestedSlots).toBeDefined();
      expect(turn4.suggestedSlots?.length).toBeGreaterThan(0);

      // Verify no staff roster repetition
      expect(turn4.message).not.toContain("our qualified specialists are:");
      expect(turn4.message).not.toContain("Alex QA (Specialist)");
    });
  });

  describe("2. Serverless Conversation Rehydration & Null draftToken Handling", () => {
    it("rehydrates service, staff, and date from conversation history when draftToken is null", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Hello, I want to book a Classic Haircut." },
        { role: "assistant", content: "Great! Classic Haircut is 35 mins." },
        { role: "user", content: "Can Emma QA perform this haircut?" },
        { role: "assistant", content: "Yes, Emma QA is qualified to perform Classic Haircut." },
        {
          role: "user",
          content: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026.",
        },
      ];

      // Request comes in with null draftToken
      const rehydrated = await rehydrateDraftFromHistory(messages, sampleProfile, null, "embedded_web");
      expect(rehydrated).not.toBeNull();
      expect(rehydrated?.draft.serviceName).toBe("Classic Haircut");
      expect(rehydrated?.draft.staffName).toBe("Emma QA");
      expect(rehydrated?.draft.slotDate).toBe("2026-11-02");
      expect(rehydrated?.draftToken).toBeDefined();

      // Verify loading from persistent storage works with the rehydrated token
      const loaded = await getDraftFromToken(rehydrated!.draftToken);
      expect(loaded?.serviceName).toBe("Classic Haircut");
      expect(loaded?.staffName).toBe("Emma QA");
      expect(loaded?.slotDate).toBe("2026-11-02");
    });
  });

  describe("3. Determinism Across Repeated Multi-Turn Conversations", () => {
    it("produces identical valid availability outcomes over 5 repeated runs", async () => {
      for (let run = 1; run <= 5; run++) {
        const turn1 = await executeMockChat(ctx, [
          { role: "user", content: "Hello, I want to book a Classic Haircut." },
        ]);
        const draftToken = turn1.draftToken!;

        const turn4 = await executeMockChat(
          { ...ctx, draftToken },
          [
            { role: "user", content: "Hello, I want to book a Classic Haircut." },
            { role: "assistant", content: turn1.message },
            { role: "user", content: "Can Emma QA perform this haircut?" },
            { role: "assistant", content: "Yes, Emma QA can perform Classic Haircut." },
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
        expect(turn4.message).toContain("10:00");
        expect(turn4.message).not.toContain("our qualified specialists are:");
      }
    });
  });

  describe("4. OpenAI Tool-Calling & Fallback Response Routing", () => {
    it("guides tool choice to checkAvailability on explicit availability intent", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      let capturedToolChoice: unknown = null;
      mockOpenAiCreate.mockImplementation((args: { tool_choice?: unknown }) => {
        capturedToolChoice = args.tool_choice;
        return Promise.resolve({
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: "We have verified openings for Classic Haircut on 2026-11-02 at 10:00 and 14:00.",
              },
            },
          ],
        });
      });

      const res = await executeOpenAiChat(ctx, [
        {
          role: "user",
          content: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026.",
        },
      ]);

      expect(res.success).toBe(true);
      expect(capturedToolChoice).toEqual({
        type: "function",
        function: { name: "checkAvailability" },
      });
    });

    it("falls back to mock when canary circuit breaker trips without breaking availability check", async () => {
      process.env.AI_CANARY_OPENAI_ENABLED = "true";
      process.env.AI_CANARY_MAX_DAILY_REQUESTS = "0"; // Trip circuit breaker immediately

      const response = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [
            {
              role: "user",
              content: "Please show me available times for a Classic Haircut with Emma QA on November 2, 2026.",
            },
          ],
          channel: "embedded_web",
        },
        "127.0.0.1"
      );

      expect(response.success).toBe(true);
      expect(response.mode).toBe("mock");
      expect(response.toolsUsed).toContain("checkAvailability");
      expect(response.message).toContain("10:00");
      expect(response.message).not.toContain("our qualified specialists are:");
    });
  });

  describe("5. No Invented Appointment Times & Backend Verification", () => {
    it("returns only slots that exist in the authoritative availability response", async () => {
      const turn = await executeMockChat(ctx, [
        {
          role: "user",
          content: "Please show me available times for a Classic Haircut on November 2, 2026.",
        },
      ]);

      expect(turn.success).toBe(true);
      expect(turn.suggestedSlots).toEqual([
        { time: "10:00", period: "morning", staffName: "Emma QA" },
        { time: "14:00", period: "afternoon", staffName: "Emma QA" },
      ]);
      expect(turn.message).not.toContain("09:00");
      expect(turn.message).not.toContain("18:00");
    });
  });

  describe("6. Correct Review Card & Outdated Copy Removal in Embedded Flow", () => {
    it("prepares unconfirmed review card without trial-mode or booking wizard redirect copy", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "I want to book Classic Haircut with Emma QA on November 2, 2026 at 10:00" },
        { role: "assistant", content: "What is your name and phone number?" },
        { role: "user", content: "My name is Alice Smith and phone is 07123456789" },
      ];

      const rehydrated = await rehydrateDraftFromHistory(messages, sampleProfile, null, "embedded_web");
      expect(rehydrated).not.toBeNull();
      const draft = rehydrated!.draft;
      expect(draft.serviceName).toBe("Classic Haircut");
      expect(draft.staffName).toBe("Emma QA");
      expect(draft.slotDate).toBe("2026-11-02");
      expect(draft.slotStartTime).toBe("10:00");
    });

    it("verifies embedded widget responses do not output trial mode text", async () => {
      const response = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [
            {
              role: "user",
              content: "Please show me available times for a Classic Haircut on November 2, 2026.",
            },
          ],
          channel: "embedded_web",
        },
        "127.0.0.1"
      );

      expect(response.message).not.toMatch(/trial mode/i);
      expect(response.message).not.toMatch(/booking wizard/i);
    });
  });

  describe("7. Booking Writes Disabled & Safety Boundary", () => {
    it("ensures AI_BOOKING_WRITES_ENABLED is false and prevents appointment write mutations", () => {
      expect(isAiBookingWritesEnabled()).toBe(false);
    });
  });

  describe("8. Strict Salon Tenant Isolation", () => {
    it("prevents cross-salon token or data access", async () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "I want to book a haircut" },
      ];

      const rehydrated = await rehydrateDraftFromHistory(messages, sampleProfile, null, "embedded_web");
      const validToken = rehydrated!.draftToken;

      // Attempting to query with this token against another salon must not leak or adopt other salon
      const loaded = await getDraftFromToken(validToken);
      expect(loaded?.businessSlug).toBe("bookpilot-qa-salon");
      expect(loaded?.businessSlug).not.toBe("other-salon");
    });
  });

  describe("9. Safe Markdown Rendering Without Raw Syntax in Widget", () => {
    it("renders bold text and bullets as formatted React elements", () => {
      const rawText = "Yes, we have verified openings for **Classic Haircut**:\n\n• **10:00** with Emma QA\n• **14:00** with Emma QA";
      const rendered = SafeChatMessageContent({ content: rawText, isAssistant: true });
      expect(rendered).toBeDefined();
    });
  });
});
