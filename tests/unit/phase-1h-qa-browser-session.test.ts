import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createQaSessionToken,
  verifyQaSessionToken,
  resolveSalonAiMode,
  processCustomerAiChat,
} from "@/features/ai-receptionist/server";

const VALID_QA_SECRET = "sk-qa-gateway-secret-32-bytes-secure";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

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
    return { success: false, error: "Salon not found." };
  }),
}));

vi.mock("@/features/public-booking/rate-limit", () => ({
  enforcePublicBookingRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/features/ai-receptionist/openai-provider", () => ({
  executeOpenAiChat: vi.fn(async () => ({
    success: true,
    message: "Real OpenAI response from gpt-4o-mini",
    toolsUsed: ["listServices"],
    mode: "openai" as const,
  })),
}));

vi.mock("@/features/ai-receptionist/mock-provider", () => ({
  executeMockChat: vi.fn(async () => ({
    success: true,
    message: "Mock assistant response",
    toolsUsed: ["getSalonInfo"],
    mode: "mock" as const,
  })),
}));

describe("Phase 1H — Browser QA Session & Cookie Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.AI_RECEPTIONIST_MODE = "mock";
    process.env.AI_BOOKING_WRITES_ENABLED = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. createQaSessionToken", () => {
    it("returns null in production environment", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const token = await createQaSessionToken("bookpilot-qa-salon");
      expect(token).toBeNull();
    });

    it("returns null for non-QA salons", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const token = await createQaSessionToken("rohan-ai-salon");
      expect(token).toBeNull();
    });

    it("returns null if secret is missing or too short", async () => {
      process.env.VERCEL_ENV = "preview";
      delete process.env.AI_QA_GATEWAY_SECRET;

      expect(await createQaSessionToken("bookpilot-qa-salon")).toBeNull();

      process.env.AI_QA_GATEWAY_SECRET = "short";
      expect(await createQaSessionToken("bookpilot-qa-salon")).toBeNull();
    });

    it("returns HMAC-signed token when in preview for bookpilot-qa-salon", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const token = await createQaSessionToken("bookpilot-qa-salon");
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token).toContain(".");
    });
  });

  describe("2. verifyQaSessionToken", () => {
    it("verifies a valid token created with the same secret in preview", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const token = await createQaSessionToken("bookpilot-qa-salon");
      const isValid = await verifyQaSessionToken(token, "bookpilot-qa-salon");
      expect(isValid).toBe(true);
    });

    it("rejects forged token signatures", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const token = await createQaSessionToken("bookpilot-qa-salon");
      const parts = token!.split(".");
      const forgedToken = `${parts[0]}.forgedsignature1234567890abcdef1234567890abcdef1234567890abcdef12345678`;

      const isValid = await verifyQaSessionToken(forgedToken, "bookpilot-qa-salon");
      expect(isValid).toBe(false);
    });

    it("rejects token if verified against another salon", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const token = await createQaSessionToken("bookpilot-qa-salon");
      const isValid = await verifyQaSessionToken(token, "rohan-ai-salon");
      expect(isValid).toBe(false);
    });

    it("rejects token in production environment", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      const token = await createQaSessionToken("bookpilot-qa-salon");

      // Now switch execution context to production
      process.env.VERCEL_ENV = "production";
      const isValid = await verifyQaSessionToken(token, "bookpilot-qa-salon");
      expect(isValid).toBe(false);
    });
  });

  describe("3. resolveSalonAiMode with QA Session Cookie", () => {
    it("activates openai when valid qaSessionToken is provided in preview", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      const token = await createQaSessionToken("bookpilot-qa-salon");
      const mode = await resolveSalonAiMode(
        "bookpilot-qa-salon",
        "mock",
        null, // No direct secret header
        token // Provided via session cookie
      );
      expect(mode).toBe("openai");
    });

    it("remains in mock mode if qaSessionToken is invalid or forged", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      const mode = await resolveSalonAiMode(
        "bookpilot-qa-salon",
        "mock",
        null,
        "invalid.token.signature"
      );
      expect(mode).toBe("mock");
    });

    it("remains in mock mode in production even with valid qaSessionToken", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      const token = await createQaSessionToken("bookpilot-qa-salon");

      process.env.VERCEL_ENV = "production";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.OPENAI_API_KEY = "sk-test-key";

      const mode = await resolveSalonAiMode(
        "bookpilot-qa-salon",
        "mock",
        null,
        token
      );
      expect(mode).toBe("mock");
    });
  });

  describe("4. processCustomerAiChat Dispatch Integration with Session Cookie", () => {
    it("dispatches to executeOpenAiChat when valid session cookie is attached", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      const token = await createQaSessionToken("bookpilot-qa-salon");
      const res = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [{ role: "user", content: "What services do you offer?" }],
        },
        "192.168.1.1",
        null, // No header
        token // Cookie
      );

      expect(res.mode).toBe("openai");
      expect(res.message).toBe("Real OpenAI response from gpt-4o-mini");
    });

    it("dispatches to executeMockChat when anonymous (no cookie and no header)", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_OPENAI_ENABLED = "true";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      process.env.OPENAI_API_KEY = "sk-test-key";

      const res = await processCustomerAiChat(
        {
          businessSlug: "bookpilot-qa-salon",
          messages: [{ role: "user", content: "What services do you offer?" }],
        },
        "192.168.1.1",
        null,
        null
      );

      expect(res.mode).toBe("mock");
      expect(res.message).toBe("Mock assistant response");
    });
  });
});
