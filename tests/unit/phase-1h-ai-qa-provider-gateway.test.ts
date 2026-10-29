import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveSalonAiMode,
  processCustomerAiChat,
  verifyQaGatewaySecret,
  isPreviewEnvironment,
} from "@/features/ai-receptionist/server";
import { confirmBookingDraft } from "@/features/ai-receptionist/booking/confirm";

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

const mockEnforceRateLimit = vi.fn(async () => ({ allowed: true }));
vi.mock("@/features/public-booking/rate-limit", () => ({
  enforcePublicBookingRateLimit: vi.fn(async () => mockEnforceRateLimit()),
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

describe("Phase 1H-AI Hardened QA Gateway — Defense in Depth", () => {
  const originalEnv = { ...process.env };
  const VALID_QA_SECRET = "test-super-secret-qa-gateway-token-32-bytes";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.AI_RECEPTIONIST_MODE = "mock";
    process.env.AI_BOOKING_WRITES_ENABLED = "false";
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.AI_QA_PREVIEW_MODE;
    delete process.env.AI_QA_OPENAI_ENABLED;
    delete process.env.AI_QA_GATEWAY_SECRET;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. isPreviewEnvironment & verifyQaGatewaySecret Utilities", () => {
    it("detects VERCEL_ENV=preview as preview environment", async () => {
      process.env.VERCEL_ENV = "preview";
      expect(await isPreviewEnvironment()).toBe(true);
    });

    it("detects explicit AI_QA_PREVIEW_MODE=true as preview environment", async () => {
      process.env.AI_QA_PREVIEW_MODE = "true";
      expect(await isPreviewEnvironment()).toBe(true);
    });

    it("STRICT: VERCEL_ENV=production is NOT a preview environment even if other flags set", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
      expect(await isPreviewEnvironment()).toBe(false);
    });

    it("verifyQaGatewaySecret fails closed when server secret is absent or short (<16 chars)", async () => {
      process.env.AI_QA_GATEWAY_SECRET = "too-short";
      expect(await verifyQaGatewaySecret("too-short")).toBe(false);
      delete process.env.AI_QA_GATEWAY_SECRET;
      expect(await verifyQaGatewaySecret(VALID_QA_SECRET)).toBe(false);
    });

    it("verifyQaGatewaySecret validates exact secret via timing-safe comparison", async () => {
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      expect(await verifyQaGatewaySecret(VALID_QA_SECRET)).toBe(true);
      expect(await verifyQaGatewaySecret("wrong-secret-that-has-equal-length-1234567")).toBe(false);
      expect(await verifyQaGatewaySecret(null)).toBe(false);
      expect(await verifyQaGatewaySecret(undefined)).toBe(false);
    });
  });

  describe("2. resolveSalonAiMode — Security Invariants", () => {
    it("returns 'openai' globally only if AI_RECEPTIONIST_MODE is globally 'openai'", async () => {
      process.env.AI_RECEPTIONIST_MODE = "openai";
      expect(await resolveSalonAiMode("rohan-ai-salon", "openai")).toBe("openai");
    });

    it("returns 'disabled' if salon AI is disabled", async () => {
      expect(await resolveSalonAiMode("bookpilot-qa-salon", "disabled", VALID_QA_SECRET)).toBe("disabled");
    });

    it("VULNERABILITY MITIGATION: Anonymous caller without secret NEVER activates OpenAI", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      // Caller sends no secret or null
      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", null)).toBe("mock");
      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", undefined)).toBe("mock");
      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", "")).toBe("mock");
    });

    it("VULNERABILITY MITIGATION: Forged secret NEVER activates OpenAI", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", "attacker-forged-token")).toBe("mock");
    });

    it("VULNERABILITY MITIGATION: Production mock mode CANNOT be bypassed even with valid secret", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", VALID_QA_SECRET)).toBe("mock");
    });

    it("STRICT CROSS-TENANT ISOLATION: Other salons CANNOT activate OpenAI even in preview with valid secret", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      expect(await resolveSalonAiMode("rohan-ai-salon", "mock", VALID_QA_SECRET)).toBe("mock");
    });

    it("FAILS CLOSED: Missing AI_QA_OPENAI_ENABLED flag blocks activation", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", VALID_QA_SECRET)).toBe("mock");
    });

    it("FAILS CLOSED: Missing OPENAI_API_KEY blocks activation", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      delete process.env.OPENAI_API_KEY;

      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", VALID_QA_SECRET)).toBe("mock");
    });

    it("SUCCESS PATH: Activates OpenAI ONLY when Preview + Flag + QA Salon + Valid Secret + API Key present", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      expect(await resolveSalonAiMode("bookpilot-qa-salon", "mock", VALID_QA_SECRET)).toBe("openai");
    });
  });

  describe("3. processCustomerAiChat Dispatch Integration", () => {
    it("anonymous public visitor receives mock response", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      const res = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [{ role: "user", content: "What services can I book?" }],
        },
        "192.168.1.1"
      );

      expect(mockExecuteMockChat).toHaveBeenCalledTimes(1);
      expect(mockExecuteOpenAiChat).not.toHaveBeenCalled();
      expect(res.mode).toBe("mock");
    });

    it("authorized QA test in preview triggers executeOpenAiChat", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      const res = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [{ role: "user", content: "What services can I book?" }],
        },
        "192.168.1.1",
        VALID_QA_SECRET
      );

      expect(mockExecuteOpenAiChat).toHaveBeenCalledTimes(1);
      expect(mockExecuteMockChat).not.toHaveBeenCalled();
      expect(res.mode).toBe("openai");
      expect(res.message).toBe("Real OpenAI response from gpt-4o-mini");
    });

    it("enforces rate limits on customer chat", async () => {
      mockEnforceRateLimit.mockResolvedValueOnce({ allowed: false });

      const res = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [{ role: "user", content: "Hello" }],
        },
        "192.168.1.1",
        VALID_QA_SECRET
      );

      expect(res.success).toBe(false);
      expect(res.code).toBe("RATE_LIMITED");
      expect(mockExecuteOpenAiChat).not.toHaveBeenCalled();
    });
  });

  describe("4. Confirmation Writes Guardrail Verification", () => {
    it("confirms AI_BOOKING_WRITES_ENABLED=false cannot be bypassed even in preview", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_BOOKING_WRITES_ENABLED = "false";

      const outcome = await confirmBookingDraft(
        {
          businessSlug: "bookpilot-qa-salon",
          draftId: "11111111-1111-4111-a111-111111111111",
          draftToken: "bkd_valid_token_sample",
          idempotencyKey: "test-idempotency-key-12345",
        },
        "192.168.1.1"
      );

      expect(outcome.success).toBe(false);
      expect(outcome.code).toBe("AI_BOOKING_WRITES_DISABLED");
      expect(outcome.stage).toBe("failed");
    });
  });
});
