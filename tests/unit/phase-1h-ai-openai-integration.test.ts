import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { executeOpenAiChat } from "@/features/ai-receptionist/openai-provider";
import { salonTools } from "@/features/ai-receptionist/tools";
import type { ToolExecutionContext } from "@/features/ai-receptionist/types";

const mockCompletionsCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: (...args: unknown[]) => mockCompletionsCreate(...args),
        },
      };
    },
  };
});

// Mock public booking server modules for tool grounding
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "test-salon" || slug === "bookpilot-qa-salon") {
      return {
        success: true,
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Test Hair Studio",
          slug,
          businessType: "salon",
          description: "Premier hair salon in London.",
          addressLine1: "123 High Street",
          city: "London",
          postalCode: "W1 1AA",
          country: "GB",
          phone: "+44 20 7946 0991",
          email: "contact@testhairstudio.com",
          timezone: "Europe/London",
          currency: "GBP",
          onlineBookingEnabled: true,
          minNoticeHours: 2,
          maxAdvanceDays: 30,
          cancellationPolicyText: "Free cancellation up to 24 hours prior to appointment.",
          openingHours: [
            { dayOfWeek: 1, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 2, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 3, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 4, isClosed: false, openTime: "09:00:00", closeTime: "20:00:00" },
            { dayOfWeek: 5, isClosed: false, openTime: "09:00:00", closeTime: "20:00:00" },
            { dayOfWeek: 6, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
          ],
          services: [
            {
              id: "22222222-2222-2222-2222-222222222222",
              name: "Classic Haircut",
              categoryName: "Hair Styling",
              durationMinutes: 35,
              bufferMinutes: 5,
              priceFormatted: "£22.00",
              priceAmount: 2200,
              currency: "GBP",
              description: "Wash and precision haircut.",
              assignedStaffIds: ["44444444-4444-4444-4444-444444444444"],
            },
            {
              id: "33333333-3333-3333-3333-333333333333",
              name: "Beard Trim",
              categoryName: "Grooming",
              durationMinutes: 20,
              bufferMinutes: 5,
              priceFormatted: "£15.00",
              priceAmount: 1500,
              currency: "GBP",
              description: "Beard styling and line-up.",
              assignedStaffIds: ["44444444-4444-4444-4444-444444444444"],
            },
          ],
          staff: [
            {
              id: "44444444-4444-4444-4444-444444444444",
              displayName: "Emma QA",
              displayOrder: 1,
            },
          ],
        },
      };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ date, staffId }) => {
    if (date === "2026-10-27" || date === "2026-10-28") {
      return {
        success: true,
        data: {
          date,
          timezone: "Europe/London",
          serviceId: "22222222-2222-2222-2222-222222222222",
          serviceName: "Classic Haircut",
          durationMinutes: 35,
          bufferMinutes: 5,
          staffPreference: staffId ? "specific" : "any",
          selectedStaffId: staffId,
          slots: [
            {
              startsAt: `${date}T10:00:00.000Z`,
              serviceEndsAt: `${date}T10:35:00.000Z`,
              availableStaffIds: ["44444444-4444-4444-4444-444444444444"],
              localTime: "10:00",
              period: "morning",
            },
            {
              startsAt: `${date}T14:00:00.000Z`,
              serviceEndsAt: `${date}T14:35:00.000Z`,
              availableStaffIds: ["44444444-4444-4444-4444-444444444444"],
              localTime: "14:00",
              period: "afternoon",
            },
          ],
          totalSlotsCount: 2,
          onlineBookingEnabled: true,
        },
      };
    }
    return {
      success: true,
      data: {
        date,
        timezone: "Europe/London",
        slots: [],
        totalSlotsCount: 0,
        onlineBookingEnabled: true,
      },
    };
  }),
}));

const mockContext: ToolExecutionContext = {
  businessId: "11111111-1111-1111-1111-111111111111",
  businessSlug: "test-salon",
  businessName: "Test Hair Studio",
  timezone: "Europe/London",
  currency: "GBP",
};

describe("Phase 1H-AI: OpenAI Integration & Real AI Receptionist Suite", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompletionsCreate.mockReset();
    process.env = { ...origEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  describe("1. Configuration & Default Model Selection", () => {
    it("fails cleanly when OPENAI_API_KEY is not configured", async () => {
      delete process.env.OPENAI_API_KEY;

      const res = await executeOpenAiChat(mockContext, [
        { role: "user", content: "Hello" },
      ]);

      expect(res.success).toBe(false);
      expect(res.code).toBe("OPENAI_KEY_MISSING");
      expect(res.mode).toBe("openai");
      expect(res.message).toContain("AI Receptionist is currently unavailable");
    });

    it("defaults to 'gpt-4o-mini' when OPENAI_MODEL is unset", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";
      delete process.env.OPENAI_MODEL;

      mockCompletionsCreate.mockResolvedValue({
        choices: [
          {
            finish_reason: "stop",
            message: { role: "assistant", content: "Hello! Welcome to Test Hair Studio." },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 },
      });

      const res = await executeOpenAiChat(mockContext, [
        { role: "user", content: "Hello" },
      ]);

      expect(res.success).toBe(true);
      expect(mockCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
        })
      );
    });

    it("respects custom OPENAI_MODEL when explicitly configured", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";
      process.env.OPENAI_MODEL = "gpt-4o";

      mockCompletionsCreate.mockResolvedValue({
        choices: [
          {
            finish_reason: "stop",
            message: { role: "assistant", content: "Welcome!" },
          },
        ],
      });

      await executeOpenAiChat(mockContext, [{ role: "user", content: "Hi" }]);

      expect(mockCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
        })
      );
    });
  });

  describe("2. Conversational Quality & Roman Urdu System Prompt", () => {
    it("constructs system prompt with Roman Urdu instructions and grounded fact rules", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      let capturedSystemPrompt = "";
      mockCompletionsCreate.mockImplementation((args: { messages: Array<{ role: string; content: string }> }) => {
        const sysMsg = args.messages.find((m) => m.role === "system");
        capturedSystemPrompt = sysMsg?.content || "";
        return Promise.resolve({
          choices: [
            {
              finish_reason: "stop",
              message: { role: "assistant", content: "Haan ji, hum Roman Urdu samajhte hain." },
            },
          ],
        });
      });

      await executeOpenAiChat(
        mockContext,
        [{ role: "user", content: "mujhe haircut karwana hai" }],
        [],
        "ur-Latn"
      );

      expect(capturedSystemPrompt).toContain("Roman Urdu");
      expect(capturedSystemPrompt).toContain("Test Hair Studio");
      expect(capturedSystemPrompt).toContain("Europe/London");
      expect(capturedSystemPrompt).toContain("prepareBookingDraft");
      expect(capturedSystemPrompt).toContain("prompt injection");
    });
  });

  describe("3. Tool Definition & Draft Preparation (prepareBookingDraft)", () => {
    it("exposes prepareBookingDraft and cancelBookingDraft without booking commit mutations", () => {
      const toolNames = Object.keys(salonTools);
      expect(toolNames).toContain("prepareBookingDraft");
      expect(toolNames).toContain("cancelBookingDraft");
      expect(toolNames).toContain("checkAvailability");
      expect(toolNames).toContain("listServices");
      expect(toolNames).toContain("listStaff");

      // Verify strict boundary: no direct write mutation tools
      expect(toolNames).not.toContain("createBooking");
      expect(toolNames).not.toContain("confirmBooking");
      expect(toolNames).not.toContain("createAppointment");
    });

    it("prepareBookingDraft checks real availability and returns review card when details are complete", async () => {
      const tool = salonTools.prepareBookingDraft;
      expect(tool).toBeDefined();

      const result = (await tool.execute(mockContext, {
        serviceName: "Classic Haircut",
        staffName: "Emma QA",
        date: "2026-10-27",
        time: "14:00",
        customerName: "Alex Tester",
        customerPhone: "+44 7700 900123",
        customerEmail: "alex@example.com",
      })) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.readyForConfirmation).toBe(true);
      expect(result.stage).toBe("awaiting_confirmation");
      expect(result.card).toBeDefined();
      expect((result.card as { type: string }).type).toBe("confirmation_review");
      expect((result.card as { title: string }).title).toBe("Please Review Your Appointment");
      expect(result.draftToken).toBeDefined();
    });

    it("prepareBookingDraft prompts for customer details when name and phone are missing", async () => {
      const tool = salonTools.prepareBookingDraft;

      const result = (await tool.execute(mockContext, {
        serviceName: "Classic Haircut",
        staffName: "Emma QA",
        date: "2026-10-27",
        time: "14:00",
      })) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.readyForConfirmation).toBe(false);
      expect(result.stage).toBe("collecting_customer_details");
      expect(result.missingFields).toContain("customerName");
      expect(result.missingFields).toContain("customerPhone");
      expect(result.card).toBeUndefined(); // Review card only appears when ready
    });

    it("prepareBookingDraft safely rejects unavailable time slots and offers suggestions", async () => {
      const tool = salonTools.prepareBookingDraft;

      const result = (await tool.execute(mockContext, {
        serviceName: "Classic Haircut",
        staffName: "Emma QA",
        date: "2026-10-27",
        time: "12:00", // Not in available slots (10:00, 14:00)
      })) as Record<string, unknown>;

      expect(result.success).toBe(false);
      expect(result.available).toBe(false);
      expect(result.error).toContain("is not available");
      expect((result.suggestedSlots as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe("4. Error Handling & Billing Exhaustion Behavior", () => {
    it("maps 429 insufficient_quota directly to OPENAI_BILLING_REQUIRED without retrying", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      const quotaError = new Error(
        "You exceeded your current quota, please check your plan and billing details."
      );
      // @ts-expect-error adding HTTP status code
      quotaError.status = 429;
      // @ts-expect-error adding API code
      quotaError.code = "insufficient_quota";

      mockCompletionsCreate.mockRejectedValue(quotaError);

      const res = await executeOpenAiChat(mockContext, [
        { role: "user", content: "Hello" },
      ]);

      expect(res.success).toBe(false);
      expect(res.code).toBe("OPENAI_BILLING_REQUIRED");
      expect(res.message).toContain("AI Receptionist is currently unavailable while API billing is being initialized");
      expect(res.error).toContain("insufficient_quota");
      // Must not perform repeated retry loops on quota errors
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(1);
    });

    it("maps 429 rate limit to OPENAI_RATE_LIMIT", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      const rateError = new Error("Rate limit reached for requests per minute.");
      // @ts-expect-error adding HTTP status code
      rateError.status = 429;

      mockCompletionsCreate.mockRejectedValue(rateError);

      const res = await executeOpenAiChat(mockContext, [
        { role: "user", content: "Hi" },
      ]);

      expect(res.success).toBe(false);
      expect(res.code).toBe("OPENAI_RATE_LIMIT");
      expect(res.message).toContain("handling high volume");
    });

    it("maps 401 invalid key to OPENAI_AUTH_FAILED", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-invalid-key";

      const authError = new Error("Incorrect API key provided: sk-mock-***");
      // @ts-expect-error adding HTTP status code
      authError.status = 401;

      mockCompletionsCreate.mockRejectedValue(authError);

      const res = await executeOpenAiChat(mockContext, [
        { role: "user", content: "Hi" },
      ]);

      expect(res.success).toBe(false);
      expect(res.code).toBe("OPENAI_AUTH_FAILED");
    });

    it("maps 404 model not found to MODEL_UNAVAILABLE", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-key";
      process.env.OPENAI_MODEL = "non-existent-model-xyz";

      const modelError = new Error("The model 'non-existent-model-xyz' does not exist.");
      // @ts-expect-error adding HTTP status code
      modelError.status = 404;

      mockCompletionsCreate.mockRejectedValue(modelError);

      const res = await executeOpenAiChat(mockContext, [
        { role: "user", content: "Hi" },
      ]);

      expect(res.success).toBe(false);
      expect(res.code).toBe("MODEL_UNAVAILABLE");
    });
  });

  describe("5. Multi-Turn Context & Draft Token Preservation", () => {
    it("receives draftToken and captures card and draft across tool execution turns", async () => {
      process.env.OPENAI_API_KEY = "sk-mock-valid-test-key-12345";

      // Round 1: Model calls prepareBookingDraft
      const mockToolCall = {
        id: "call_draft_123",
        type: "function" as const,
        function: {
          name: "prepareBookingDraft",
          arguments: JSON.stringify({
            serviceName: "Classic Haircut",
            staffName: "Emma QA",
            date: "2026-10-27",
            time: "14:00",
            customerName: "Sajid Khan",
            customerPhone: "+44 7700 900123",
          }),
        },
      };

      mockCompletionsCreate
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: null,
                tool_calls: [mockToolCall],
              },
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
        })
        .mockResolvedValueOnce({
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content:
                  "I've prepared your Classic Haircut booking with Emma QA for October 27 at 14:00. Please review the details on the card below and confirm!",
              },
            },
          ],
          usage: { prompt_tokens: 180, completion_tokens: 30, total_tokens: 210 },
        });

      const res = await executeOpenAiChat(
        mockContext,
        [
          {
            role: "user",
            content: "Please book Classic Haircut with Emma QA tomorrow at 14:00, my name is Sajid Khan, phone +44 7700 900123",
          },
        ],
        [],
        "en",
        "bkd_existing_token_xyz"
      );

      expect(res.success).toBe(true);
      expect(res.toolsUsed).toContain("prepareBookingDraft");
      expect(res.card).toBeDefined();
      expect(res.card?.type).toBe("confirmation_review");
      expect(res.draft).toBeDefined();
      expect(res.draftToken).toBeDefined();
      expect(res.bookingHandoff?.hasIntent).toBe(true);
    });
  });
});
