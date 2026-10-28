import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveSalonAiMode, processCustomerAiChat } from "@/features/ai-receptionist/server";

// Mock public booking server
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "bookpilot-qa-salon") {
      return {
        success: true,
        data: {
          id: "0c60d233-a86f-499d-9846-4cd3daf8ca1a",
          name: "BookPilot QA Salon",
          slug: "bookpilot-qa-salon",
          businessType: "salon",
          timezone: "Europe/London",
          currency: "GBP",
          services: [],
          staff: [],
        },
      };
    }
    if (slug === "rohan-ai-salon") {
      return {
        success: true,
        data: {
          id: "4d3675c7-c480-4fc3-8dd0-d7324334b92f",
          name: "Rohan AI Salon",
          slug: "rohan-ai-salon",
          businessType: "salon",
          timezone: "Europe/London",
          currency: "GBP",
          services: [],
          staff: [],
        },
      };
    }
    return { success: false, error: "Salon not found." };
  }),
}));

vi.mock("@/features/public-booking/rate-limit", () => ({
  enforcePublicBookingRateLimit: vi.fn(async () => ({ allowed: true })),
}));

// Mock executeOpenAiChat and executeMockChat
const mockExecuteOpenAiChat = vi.fn(async () => ({
  success: true,
  message: "Real OpenAI response from gpt-4o-mini",
  toolsUsed: ["listServices"],
  mode: "openai" as const,
}));

const mockExecuteMockChat = vi.fn(async () => ({
  success: true,
  message: "Mock assistant response",
  toolsUsed: ["getSalonInfo"],
  mode: "mock" as const,
}));

vi.mock("@/features/ai-receptionist/openai-provider", () => ({
  executeOpenAiChat: vi.fn(async () => mockExecuteOpenAiChat()),
}));

vi.mock("@/features/ai-receptionist/mock-provider", () => ({
  executeMockChat: vi.fn(async () => mockExecuteMockChat()),
}));

describe("Phase 1H-AI QA Provider Gateway — Isolation & Safety Guardrails", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.AI_RECEPTIONIST_MODE = "mock";
    process.env.AI_BOOKING_WRITES_ENABLED = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. resolveSalonAiMode — Pure Boundary Rules", () => {
    it("returns 'openai' globally if AI_RECEPTIONIST_MODE is 'openai'", () => {
      const mode = resolveSalonAiMode("rohan-ai-salon", "openai");
      expect(mode).toBe("openai");
    });

    it("returns 'disabled' if base mode is 'disabled'", () => {
      const mode = resolveSalonAiMode("bookpilot-qa-salon", "disabled", "openai");
      expect(mode).toBe("disabled");
    });

    it("STRICT CROSS-TENANT ISOLATION: non-QA salon is NEVER allowed to activate OpenAI", () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";
      const mode = resolveSalonAiMode("rohan-ai-salon", "mock", "openai");
      expect(mode).toBe("mock");
    });

    it("STRICT CROSS-TENANT ISOLATION: production salons with no override stay in mock", () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";
      const mode = resolveSalonAiMode("rohan-ai-salon", "mock");
      expect(mode).toBe("mock");
    });

    it("QA salon stays in 'mock' mode by default if no QA override is requested", () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";
      const mode = resolveSalonAiMode("bookpilot-qa-salon", "mock");
      expect(mode).toBe("mock");
    });

    it("QA salon stays in 'mock' if qaOverride='openai' but OPENAI_API_KEY is missing", () => {
      delete process.env.OPENAI_API_KEY;
      const mode = resolveSalonAiMode("bookpilot-qa-salon", "mock", "openai");
      expect(mode).toBe("mock");
    });

    it("QA salon successfully resolves to 'openai' when qaOverride='openai' and OPENAI_API_KEY is present", () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";
      const mode = resolveSalonAiMode("bookpilot-qa-salon", "mock", "openai");
      expect(mode).toBe("openai");
    });

    it("QA salon successfully resolves to 'openai' when AI_QA_OPENAI_SALONS='bookpilot-qa-salon' is configured in env", () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";
      process.env.AI_QA_OPENAI_SALONS = "bookpilot-qa-salon";
      const mode = resolveSalonAiMode("bookpilot-qa-salon", "mock");
      expect(mode).toBe("openai");
    });
  });

  describe("2. processCustomerAiChat Dispatch Integration", () => {
    it("dispatches regular production salon to executeMockChat, rejecting override", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";

      const res = await processCustomerAiChat({
        businessSlug: "rohan-ai-salon",
        messages: [{ role: "user", content: "What services do you offer?" }],
        qaProviderOverride: "openai", // Attempt cross-tenant override
      });

      expect(mockExecuteMockChat).toHaveBeenCalledTimes(1);
      expect(mockExecuteOpenAiChat).not.toHaveBeenCalled();
      expect(res.mode).toBe("mock");
    });

    it("dispatches bookpilot-qa-salon to executeMockChat when no override is passed", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";

      const res = await processCustomerAiChat({
        businessSlug: "bookpilot-qa-salon",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(mockExecuteMockChat).toHaveBeenCalledTimes(1);
      expect(mockExecuteOpenAiChat).not.toHaveBeenCalled();
      expect(res.mode).toBe("mock");
    });

    it("dispatches bookpilot-qa-salon to executeOpenAiChat when qaProviderOverride='openai' is passed", async () => {
      process.env.OPENAI_API_KEY = "sk-test-key-12345";

      const res = await processCustomerAiChat({
        businessSlug: "bookpilot-qa-salon",
        messages: [{ role: "user", content: "What services can I book?" }],
        qaProviderOverride: "openai",
      });

      expect(mockExecuteOpenAiChat).toHaveBeenCalledTimes(1);
      expect(mockExecuteMockChat).not.toHaveBeenCalled();
      expect(res.mode).toBe("openai");
      expect(res.message).toBe("Real OpenAI response from gpt-4o-mini");
    });
  });
});
