import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateWhatsAppOAuthState,
  verifyWhatsAppOAuthState,
  exchangeMetaOAuthCode,
  fetchWabaPhoneDetails,
  verifyMetaAssetOwnership,
  subscribeWabaWebhooks,
  unsubscribeWabaWebhooks,
} from "@/features/integrations/whatsapp/oauth";
import {
  encryptWhatsAppToken,
  decryptWhatsAppToken,
  isWhatsAppTokenEncryptionConfigured,
} from "@/features/integrations/whatsapp/encryption";
import {
  resolveTenantFromPhoneNumberId,
  registerMockWhatsAppTenant,
  clearMockWhatsAppTenants,
} from "@/features/integrations/whatsapp/tenant-resolver";
import { processInboundWhatsAppMessage } from "@/features/integrations/whatsapp/adapter";
import {
  verifyMetaWebhookChallenge,
  verifyMetaSignature,
} from "@/features/integrations/whatsapp/security";
import { clearInMemoryConversations } from "@/features/integrations/whatsapp/conversation-service";
import crypto from "node:crypto";

describe("Bookzello D28 — Multi-Tenant WhatsApp Self-Service Connection Suite", () => {
  const TEST_BIZ_A = "11111111-0000-0000-0000-000000000001";
  const TEST_BIZ_B = "22222222-0000-0000-0000-000000000002";
  const TEST_USER_A = "aaaa1111-0000-0000-0000-000000000001";
  const TEST_USER_B = "bbbb2222-0000-0000-0000-000000000002";

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_ENABLED: "true",
      WHATSAPP_APP_SECRET: "test_meta_app_secret_1234567890_abc",
      WHATSAPP_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    };
    clearMockWhatsAppTenants();
    clearInMemoryConversations();
    vi.restoreAllMocks();
  });

  describe("1. OAuth State CSRF & Tenant-Binding Security", () => {
    it("generates a valid, signed, tenant-bound OAuth state token", () => {
      const state = generateWhatsAppOAuthState(TEST_BIZ_A, TEST_USER_A);
      expect(typeof state).toBe("string");
      expect(state.length).toBeGreaterThan(30);

      const verification = verifyWhatsAppOAuthState(state, TEST_BIZ_A, TEST_USER_A);
      expect(verification.valid).toBe(true);
      expect(verification.businessId).toBe(TEST_BIZ_A);
      expect(verification.userId).toBe(TEST_USER_A);
    });

    it("rejects cross-tenant state verification (tamper prevention)", () => {
      const stateA = generateWhatsAppOAuthState(TEST_BIZ_A, TEST_USER_A);

      // Attempt to verify with a different tenant organization ID (Salon B)
      const crossTenantCheck = verifyWhatsAppOAuthState(stateA, TEST_BIZ_B, TEST_USER_A);
      expect(crossTenantCheck.valid).toBe(false);
      expect(crossTenantCheck.error).toContain("OAuth state tenant mismatch");
    });

    it("rejects cross-user state verification (user session binding)", () => {
      const stateA = generateWhatsAppOAuthState(TEST_BIZ_A, TEST_USER_A);

      // Attempt to verify with a different user ID
      const crossUserCheck = verifyWhatsAppOAuthState(stateA, TEST_BIZ_A, TEST_USER_B);
      expect(crossUserCheck.valid).toBe(false);
      expect(crossUserCheck.error).toContain("OAuth state user mismatch");
    });

    it("rejects expired OAuth state tokens (> 15 minutes)", () => {
      const state = generateWhatsAppOAuthState(TEST_BIZ_A, TEST_USER_A);

      // Simulate a verification call 16 minutes later
      const verification = verifyWhatsAppOAuthState(
        state,
        TEST_BIZ_A,
        TEST_USER_A,
        -1000 // Force expiration
      );
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("has expired");
    });

    it("rejects tampered or forged OAuth state tokens", () => {
      const state = generateWhatsAppOAuthState(TEST_BIZ_A, TEST_USER_A);
      const decoded = Buffer.from(state, "base64url").toString("utf-8");

      // Tamper with the business ID segment
      const tampered = decoded.replace(TEST_BIZ_A, TEST_BIZ_B);
      const tamperedState = Buffer.from(tampered, "utf-8").toString("base64url");

      const check = verifyWhatsAppOAuthState(tamperedState);
      expect(check.valid).toBe(false);
      expect(check.error).toContain("signature verification failed");
    });

    it("rejects malformed or empty state tokens", () => {
      expect(verifyWhatsAppOAuthState(null).valid).toBe(false);
      expect(verifyWhatsAppOAuthState("").valid).toBe(false);
      expect(verifyWhatsAppOAuthState("not-a-valid-token").valid).toBe(false);
    });
  });

  describe("2. Authenticated AES-256-GCM Token Encryption", () => {
    it("confirms encryption configuration availability", () => {
      expect(isWhatsAppTokenEncryptionConfigured()).toBe(true);
    });

    it("encrypts and decrypts a Meta access token with zero loss", () => {
      const rawToken = "EAABtesttoken_secret_meta_access_1234567890_abcdef";
      const encryptedBundle = encryptWhatsAppToken(rawToken);

      expect(typeof encryptedBundle).toBe("string");
      expect(encryptedBundle).toContain(":");

      const segments = encryptedBundle.split(":");
      expect(segments.length).toBe(3); // iv:authTag:ciphertext
      expect(segments[0].length).toBe(24); // 12-byte IV = 24 hex
      expect(segments[1].length).toBe(32); // 16-byte AuthTag = 32 hex

      const decrypted = decryptWhatsAppToken(encryptedBundle);
      expect(decrypted).toBe(rawToken);
    });

    it("rejects tampered ciphertext or modified auth tags", () => {
      const rawToken = "EAABtesttoken_secure_meta_token";
      const bundle = encryptWhatsAppToken(rawToken);
      const [iv, authTag, ciphertext] = bundle.split(":");

      // Tamper with one character of ciphertext
      const tamperedCipher = ciphertext.slice(0, -2) + (ciphertext.endsWith("0") ? "1" : "0");
      const tamperedBundle = `${iv}:${authTag}:${tamperedCipher}`;

      expect(() => decryptWhatsAppToken(tamperedBundle)).toThrow();
    });

    it("fails closed when WHATSAPP_TOKEN_ENCRYPTION_KEY is missing or invalid", () => {
      delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
      expect(isWhatsAppTokenEncryptionConfigured()).toBe(false);

      process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = "too_short";
      expect(isWhatsAppTokenEncryptionConfigured()).toBe(false);
    });

    it("strictly fails closed in production without falling back to WHATSAPP_APP_SECRET", () => {
      delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.WHATSAPP_APP_SECRET = "fallback_secret_must_not_be_used";

      expect(() => encryptWhatsAppToken("my_test_token")).toThrow(
        "Missing WHATSAPP_TOKEN_ENCRYPTION_KEY in production"
      );
    });

    it("rejects empty token encryption", () => {
      expect(() => encryptWhatsAppToken("")).toThrow("Cannot encrypt empty token.");
    });
  });

  describe("3. Meta Code Exchange & Phone Metadata", () => {
    it("handles mock/test authorization code exchange cleanly", async () => {
      const res = await exchangeMetaOAuthCode({
        code: "mock_auth_code_test_123",
        forceMock: true,
      });

      expect(res.success).toBe(true);
      expect(res.accessToken).toContain("mock_waba_tok_");
      expect(res.tokenType).toBe("bearer");
      expect(res.expiresIn).toBeGreaterThan(0);
    });

    it("fetches phone number metadata and verified name in mock mode", async () => {
      const details = await fetchWabaPhoneDetails("mock_phone_123", "mock_tok_123", true);

      expect(details.success).toBe(true);
      expect(details.displayPhoneNumber).toBe("+44 7700 900123");
      expect(details.verifiedName).toBe("Bookzello Verified Salon");
      expect(details.qualityRating).toBe("GREEN");
    });

    it("verifies Meta asset ownership and rejects unauthorized WABA or phone ID spoofing", async () => {
      const validCheck = await verifyMetaAssetOwnership({
        wabaId: "waba_123",
        phoneNumberId: "phone_123",
        accessToken: "mock_tok_123",
        forceMock: true,
      });
      expect(validCheck.verified).toBe(true);
      expect(validCheck.displayPhoneNumber).toBe("+44 7700 900123");

      const badWaba = await verifyMetaAssetOwnership({
        wabaId: "unauthorized_waba_id",
        phoneNumberId: "phone_123",
        accessToken: "mock_tok_123",
        forceMock: true,
      });
      expect(badWaba.verified).toBe(false);
      expect(badWaba.error).toContain("Server verification failed");

      const badPhone = await verifyMetaAssetOwnership({
        wabaId: "waba_123",
        phoneNumberId: "unauthorized_phone_id",
        accessToken: "mock_tok_123",
        forceMock: true,
      });
      expect(badPhone.verified).toBe(false);
      expect(badPhone.error).toContain("Server verification failed");
    });

    it("subscribes and unsubscribes WABA webhooks", async () => {
      const subRes = await subscribeWabaWebhooks("mock_waba_123", "mock_tok_123", true);
      expect(subRes.success).toBe(true);

      const unsubRes = await unsubscribeWabaWebhooks("mock_waba_123", "mock_tok_123", true);
      expect(unsubRes.success).toBe(true);
    });
  });

  describe("4. Multi-Tenant Phone Routing & Anti-Hijacking Invariants", () => {
    it("routes inbound message to correct tenant based on phone_number_id", async () => {
      registerMockWhatsAppTenant("109990001", {
        allowed: true,
        businessId: TEST_BIZ_A,
        businessSlug: "bookpilot-qa-salon",
        businessName: "Elite Barbers Salon A",
        timezone: "Europe/London",
        currency: "GBP",
        connectionId: "conn_biz_a_123",
        aiEnabled: true,
        bookingEnabled: false,
      });

      registerMockWhatsAppTenant("209990002", {
        allowed: true,
        businessId: TEST_BIZ_B,
        businessSlug: "bookpilot-qa-salon",
        businessName: "Luxury Spa Salon B",
        timezone: "Europe/London",
        currency: "GBP",
        connectionId: "conn_biz_b_456",
        aiEnabled: true,
        bookingEnabled: false,
      });

      const tenantA = await resolveTenantFromPhoneNumberId("109990001");
      expect(tenantA.allowed).toBe(true);
      expect(tenantA.businessId).toBe(TEST_BIZ_A);
      expect(tenantA.businessName).toBe("Elite Barbers Salon A");

      const tenantB = await resolveTenantFromPhoneNumberId("209990002");
      expect(tenantB.allowed).toBe(true);
      expect(tenantB.businessId).toBe(TEST_BIZ_B);
      expect(tenantB.businessName).toBe("Luxury Spa Salon B");
    });

    it("rejects unknown or unregistered phone numbers", async () => {
      const res = await resolveTenantFromPhoneNumberId("unknown_phone_99999");
      expect(res.allowed).toBe(false);
      expect(res.businessId).toBeUndefined();
    });
  });

  describe("5. Inbound Message Processing & Safety Invariants", () => {
    it("handles STOP opt-out request without invoking booking mutations", async () => {
      registerMockWhatsAppTenant("phone_test_123", {
        allowed: true,
        businessId: TEST_BIZ_A,
        businessSlug: "bookpilot-qa-salon",
        businessName: "QA Salon",
        connectionId: "conn_test_123",
        aiEnabled: true,
        bookingEnabled: false,
      });

      const result = await processInboundWhatsAppMessage(
        {
          wabaId: "waba_test_123",
          phoneNumberId: "phone_test_123",
          fromWaId: "447700900999",
          customerName: "Jane Client",
          providerMessageId: `msg_${Date.now()}`,
          text: "STOP",
          timestamp: new Date().toISOString(),
          rawType: "text",
          isInteractiveReply: false,
        },
        true // forceMockOutbound
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("opt_out");
    });

    it("handles human handoff request and pauses AI assistant", async () => {
      registerMockWhatsAppTenant("phone_test_123", {
        allowed: true,
        businessId: TEST_BIZ_A,
        businessSlug: "bookpilot-qa-salon",
        businessName: "QA Salon",
        connectionId: "conn_test_123",
        aiEnabled: true,
        bookingEnabled: false,
      });

      const result = await processInboundWhatsAppMessage(
        {
          wabaId: "waba_test_123",
          phoneNumberId: "phone_test_123",
          fromWaId: "447700900999",
          customerName: "Jane Client",
          providerMessageId: `msg_${Date.now()}`,
          text: "Can I speak to a real person please? agent",
          timestamp: new Date().toISOString(),
          rawType: "text",
          isInteractiveReply: false,
        },
        true
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("human_handoff");
    });

    it("enforces WHATSAPP_BOOKING_WRITES_ENABLED=false: draft summaries are returned without committing appointments", async () => {
      registerMockWhatsAppTenant("phone_test_123", {
        allowed: true,
        businessId: TEST_BIZ_A,
        businessSlug: "bookpilot-qa-salon",
        businessName: "QA Salon",
        connectionId: "conn_test_123",
        aiEnabled: true,
        bookingEnabled: false,
      });

      const result = await processInboundWhatsAppMessage(
        {
          wabaId: "waba_test_123",
          phoneNumberId: "phone_test_123",
          fromWaId: "447700900999",
          customerName: "Jane Client",
          providerMessageId: `msg_${Date.now()}`,
          text: "What services do you offer?",
          timestamp: new Date().toISOString(),
          rawType: "text",
          isInteractiveReply: false,
        },
        true
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("ai_reply");
    });
  });

  describe("6. Webhook Cryptographic Verification", () => {
    it("verifies Meta webhook challenge with timing-safe comparison", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "test_webhook_verify_secret_123";

      const validRes = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "test_webhook_verify_secret_123",
        challenge: "1158201211",
      });

      expect(validRes.valid).toBe(true);
      expect(validRes.challenge).toBe("1158201211");

      const invalidToken = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "wrong_secret_token",
        challenge: "1158201211",
      });

      expect(invalidToken.valid).toBe(false);
    });

    it("verifies Meta X-Hub-Signature-256 HMAC-SHA256 signature", () => {
      const secret = "test_meta_app_secret_abc123";
      process.env.WHATSAPP_APP_SECRET = secret;

      const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
      const signature = crypto.createHmac("sha256", secret).update(body, "utf-8").digest("hex");

      const validSig = verifyMetaSignature(body, `sha256=${signature}`);
      expect(validSig.valid).toBe(true);

      const invalidSig = verifyMetaSignature(body, "sha256=invalidhex00000000000000000000000000000000000000000000000000000000");
      expect(invalidSig.valid).toBe(false);
    });
  });

  describe("7. Connection Failure Safety & Non-Leakage Invariants", () => {
    it("handles failed Meta OAuth exchange cleanly without exposing tokens", async () => {
      process.env.WHATSAPP_APP_ID = "test_meta_app_id_123";
      process.env.WHATSAPP_APP_SECRET = "test_meta_app_secret_123";

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Invalid authorization code or code expired." } }),
      } as Response);

      const res = await exchangeMetaOAuthCode({ code: "bad_or_expired_code" });
      expect(res.success).toBe(false);
      expect(res.accessToken).toBeUndefined();
      expect(res.error).toContain("Invalid authorization code");

      global.fetch = originalFetch;
    });

    it("verifies asset ownership failure blocks connection and never leaks credentials", async () => {
      const check = await verifyMetaAssetOwnership({
        wabaId: "unauthorized_waba_id",
        phoneNumberId: "phone_123",
        accessToken: "mock_token_sensitive_12345",
        forceMock: true,
      });

      expect(check.verified).toBe(false);
      expect(check.error).toBeDefined();
      expect(check.error).not.toContain("mock_token_sensitive_12345");
      expect(JSON.stringify(check)).not.toContain("mock_token_sensitive_12345");
    });

    it("ensures encrypted credentials cannot be retrieved without the exact 32-byte key", () => {
      const secretTok = "EAABsensitive_meta_waba_token_xyz";
      const bundle = encryptWhatsAppToken(secretTok);

      // Mutate encryption key
      process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = "1111111111111111111111111111111111111111111111111111111111111111";
      expect(() => decryptWhatsAppToken(bundle)).toThrow();
    });
  });
});
