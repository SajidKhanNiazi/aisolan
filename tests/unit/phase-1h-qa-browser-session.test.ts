import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  createQaSessionToken,
  verifyQaSessionToken,
  resolveSalonAiMode,
  processCustomerAiChat,
  createQaActivationTicket,
  consumeQaActivationTicket,
  verifyQaActivationTicket,
  _resetConsumedTicketsForTesting,
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

  describe("5. consumeQaActivationTicket & Replay Protection (Adversarial Tests)", () => {
    beforeEach(async () => {
      await _resetConsumedTicketsForTesting();
    });

    it("creates and successfully consumes a valid ticket on first attempt in preview", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const ticket = await createQaActivationTicket("bookpilot-qa-salon");
      expect(ticket).toBeTruthy();

      const result = await consumeQaActivationTicket(ticket);
      expect(result.success).toBe(true);
    });

    it("supports verifyQaActivationTicket backward-compatibility wrapper with replay protection", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const ticket = await createQaActivationTicket("bookpilot-qa-salon");
      expect(await verifyQaActivationTicket(ticket)).toBe(true);
      // Second attempt must fail replay guard
      expect(await verifyQaActivationTicket(ticket)).toBe(false);
    });

    it("enforces atomic replay protection: blocks second consumption of the same ticket", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const ticket = await createQaActivationTicket("bookpilot-qa-salon");

      // First attempt succeeds
      const firstRes = await consumeQaActivationTicket(ticket);
      expect(firstRes.success).toBe(true);

      // Replay attempt must be rejected with ALREADY_CONSUMED
      const replayRes = await consumeQaActivationTicket(ticket);
      expect(replayRes.success).toBe(false);
      expect(replayRes.reason).toBe("ALREADY_CONSUMED");
    });

    it("rejects expired tickets", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      // Construct ticket expired 10 seconds ago
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        type: "qa_activation_ticket",
        salon: "bookpilot-qa-salon",
        nonce: crypto.randomUUID(),
        iat: now - 130,
        exp: now - 10, // Expired
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = crypto
        .createHmac("sha256", VALID_QA_SECRET)
        .update(payloadB64)
        .digest("hex");
      const expiredTicket = `${payloadB64}.${signature}`;

      const res = await consumeQaActivationTicket(expiredTicket);
      expect(res.success).toBe(false);
      expect(res.reason).toBe("EXPIRED");
    });

    it("rejects forged ticket signatures", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      const ticket = await createQaActivationTicket("bookpilot-qa-salon");
      const [payloadB64] = ticket!.split(".");
      const forgedTicket = `${payloadB64}.forgedsignature1234567890abcdef1234567890abcdef1234567890abcdef12345678`;

      const res = await consumeQaActivationTicket(forgedTicket);
      expect(res.success).toBe(false);
      expect(res.reason).toBe("INVALID_SIGNATURE");
    });

    it("rejects cross-tenant activation tickets", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      // Attempt creating ticket for another salon
      const crossSalonTicket = await createQaActivationTicket("rohan-ai-salon");
      expect(crossSalonTicket).toBeNull();

      // Forged payload targeting another salon
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        type: "qa_activation_ticket",
        salon: "rohan-ai-salon",
        nonce: crypto.randomUUID(),
        iat: now,
        exp: now + 120,
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = crypto
        .createHmac("sha256", VALID_QA_SECRET)
        .update(payloadB64)
        .digest("hex");
      const crossTicket = `${payloadB64}.${signature}`;

      const res = await consumeQaActivationTicket(crossTicket);
      expect(res.success).toBe(false);
      expect(res.reason).toBe("INVALID_TARGET");
    });

    it("categorically rejects activation in production environment", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;
      const ticket = await createQaActivationTicket("bookpilot-qa-salon");

      // Switch context to production
      process.env.VERCEL_ENV = "production";
      const res = await consumeQaActivationTicket(ticket);
      expect(res.success).toBe(false);
      expect(res.reason).toBe("PRODUCTION_DISABLED");
    });

    it("rejects malformed or empty tickets", async () => {
      process.env.VERCEL_ENV = "preview";
      process.env.AI_QA_GATEWAY_SECRET = VALID_QA_SECRET;

      expect((await consumeQaActivationTicket(null)).success).toBe(false);
      expect((await consumeQaActivationTicket("")).success).toBe(false);
      expect((await consumeQaActivationTicket("nosignature")).success).toBe(false);
      expect((await consumeQaActivationTicket("notb64.nosig")).success).toBe(false);
    });
  });
});
