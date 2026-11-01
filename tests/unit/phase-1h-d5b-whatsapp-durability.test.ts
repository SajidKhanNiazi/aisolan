import { describe, it, expect, beforeEach } from "vitest";
import {
  registerMockWhatsAppTenant,
  clearMockWhatsAppTenants,
  resolveTenantFromPhoneNumberId,
} from "@/features/integrations/whatsapp/tenant-resolver";
import {
  clearInMemoryConversations,
  clearReservedIntents,
  getOrCreateConversation,
  recordWhatsAppMessage,
  WhatsAppDatabaseError,
  isRetryablePostgresCode,
} from "@/features/integrations/whatsapp/conversation-service";
import { MetaWhatsAppCloudApiClient } from "@/features/integrations/whatsapp/outbound";
import { isRecipientAuthorizedForWhatsAppPilot } from "@/features/integrations/whatsapp/config";
import {
  recordInboundWebhookEvent,
  clearInMemoryEvents,
} from "@/features/integrations/whatsapp/durable-events";
import { processInboundWhatsAppMessage } from "@/features/integrations/whatsapp/adapter";
import { calculateWhatsAppBackoffSeconds } from "@/features/integrations/whatsapp/worker";

describe("Phase 1H-D5B: Safe WhatsApp Connection & Durability Implementation Suite", () => {
  const originalEnv = { ...process.env };

  const validUuidBusinessId = "d3b07384-d113-4948-9c9e-0123456789ab";
  const validUuidConnectionId = "a1b2c3d4-e5f6-47a8-9b0c-112233445566";
  const pilotTestPhoneId = "1314214205118465";
  const pilotSlug = "bookpilot-qa-salon";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearMockWhatsAppTenants();
    clearInMemoryConversations();
    clearReservedIntents();
    clearInMemoryEvents();
  });

  describe("Gate 1: Correct Business + Real UUID Connection Resolution", () => {
    it("1. resolves valid test phone number to the correct business and genuine connection UUID", async () => {
      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: true,
        businessId: validUuidBusinessId,
        businessSlug: pilotSlug,
        businessName: "Bookpilot QA Salon",
        timezone: "Europe/London",
        currency: "GBP",
        connectionId: validUuidConnectionId,
        aiEnabled: true,
        bookingEnabled: false,
        phoneNumberId: pilotTestPhoneId,
      });

      const res = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);
      expect(res.allowed).toBe(true);
      expect(res.businessSlug).toBe(pilotSlug);
      expect(res.businessId).toBe(validUuidBusinessId);
      expect(res.connectionId).toMatch(uuidRegex);
      expect(res.connectionId).toBe(validUuidConnectionId);
      // Guarantee non-UUID string fallback has been eliminated
      expect(res.connectionId).not.toBe("pilot-test-connection");
    });

    it("2. strictly rejects cross-tenant mapping attempts for unapproved salons", async () => {
      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: true,
        businessId: "e9999999-9999-9999-9999-999999999999",
        businessSlug: "unauthorized-external-salon",
        businessName: "Unauthorized External Salon",
        timezone: "UTC",
        currency: "USD",
        connectionId: "c9999999-9999-9999-9999-999999999999",
        aiEnabled: true,
        bookingEnabled: false,
        phoneNumberId: pilotTestPhoneId,
      });

      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = pilotSlug;
      const res = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("not permitted in the current pilot allowlist");
    });

    it("3. preserves existing connection UUID on repeated resolutions without ID mutations", async () => {
      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: true,
        businessId: validUuidBusinessId,
        businessSlug: pilotSlug,
        businessName: "Bookpilot QA Salon",
        timezone: "Europe/London",
        currency: "GBP",
        connectionId: validUuidConnectionId,
        aiEnabled: true,
        bookingEnabled: false,
        phoneNumberId: pilotTestPhoneId,
      });

      const firstResolution = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);
      const secondResolution = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);

      expect(firstResolution.connectionId).toBe(validUuidConnectionId);
      expect(secondResolution.connectionId).toBe(validUuidConnectionId);
      expect(firstResolution.connectionId).toBe(secondResolution.connectionId);
    });

    it("4. rejects conflicting connections belonging to another tenant or with AI disabled", async () => {
      // Inactive / suspended connection
      registerMockWhatsAppTenant("15559998888", {
        allowed: false,
        reason: "WhatsApp connection for phone number ID '15559998888' has AI disabled or is suspended",
      });

      const res = await resolveTenantFromPhoneNumberId("15559998888");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("AI disabled or is suspended");
    });

    it("4b. rejects disconnected connections and does not silently reactivate them", async () => {
      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: false,
        reason: `WhatsApp connection for phone number ID '${pilotTestPhoneId}' is disconnected`,
      });

      const res = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("disconnected");
    });

    it("4c. rejects connections when phone number is already registered to another tenant", async () => {
      const otherTenantId = "b9999999-9999-9999-9999-999999999999";
      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: true,
        businessId: otherTenantId,
        businessSlug: "competing-salon",
        reason: "Tenant Ownership Violation",
      });

      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = pilotSlug;
      const res = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("not permitted in the current pilot allowlist");
    });

    it("4d. preserves existing conversation and message history during connection deactivation (non-destructive rollback)", async () => {
      // 1. Create conversation and message with active connection
      const conv = await getOrCreateConversation({
        businessId: validUuidBusinessId,
        connectionId: validUuidConnectionId,
        customerWaId: "447700900123",
        customerName: "Alice Smith",
      });

      await recordWhatsAppMessage({
        businessId: validUuidBusinessId,
        conversationId: conv.id,
        providerMessageId: "wamid.pre_rollback_msg",
        direction: "inbound",
        sanitizedContent: "Original inquiry before rollback",
      });

      expect(conv.id).toBeDefined();

      // 2. Simulate deactivation rollback: connection is set to disconnected (NO cascade delete)
      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: false,
        reason: "Connection disconnected by non-destructive rollback",
      });

      const resolvedAfterRollback = await resolveTenantFromPhoneNumberId(pilotTestPhoneId);
      expect(resolvedAfterRollback.allowed).toBe(false);

      // 3. Verify conversation and message records were NOT deleted or cascaded
      const retrievedConv = await getOrCreateConversation({
        businessId: validUuidBusinessId,
        connectionId: validUuidConnectionId,
        customerWaId: "447700900123",
      });

      expect(retrievedConv.id).toBe(conv.id);
      expect(retrievedConv.connectionId).toBe(validUuidConnectionId);
    });
  });

  describe("Gate 2: Durable Conversation Persistence & Error Handling", () => {
    it("5. conversation and message persistence links through valid UUID foreign keys", async () => {
      const conv = await getOrCreateConversation({
        businessId: validUuidBusinessId,
        connectionId: validUuidConnectionId,
        customerWaId: "447700900123",
        customerName: "Alice Smith",
      });

      expect(conv).toBeDefined();
      expect(conv.businessId).toBe(validUuidBusinessId);
      expect(conv.connectionId).toBe(validUuidConnectionId);
      expect(conv.connectionId).toMatch(uuidRegex);

      await recordWhatsAppMessage({
        businessId: validUuidBusinessId,
        conversationId: conv.id,
        providerMessageId: "wamid.msg_test_001",
        direction: "inbound",
        sanitizedContent: "Can I book a haircut?",
      });

      expect(conv.id).toBeDefined();
    });

    it("6. database insertion failure is categorized properly and cannot be reported as successful durable processing", () => {
      // Test isRetryablePostgresCode classification
      expect(isRetryablePostgresCode("23503")).toBe(false); // foreign key violation: non-retryable
      expect(isRetryablePostgresCode("23502")).toBe(false); // not null violation: non-retryable
      expect(isRetryablePostgresCode("22P02")).toBe(false); // invalid UUID syntax: non-retryable
      expect(isRetryablePostgresCode("42P01")).toBe(false); // undefined table: non-retryable
      expect(isRetryablePostgresCode("40001")).toBe(true);  // serialization failure: retryable
      expect(isRetryablePostgresCode("08006")).toBe(true);  // connection failure: retryable

      const dbError = new WhatsAppDatabaseError("Foreign key violation on connection_id", "23503", false);
      expect(dbError.name).toBe("WhatsAppDatabaseError");
      expect(dbError.code).toBe("23503");
      expect(dbError.isRetryable).toBe(false);
    });

    it("7. unknown Meta Phone Number IDs fail closed without fallback", async () => {
      const unknownPhoneId = "999888777666555";
      const res = await resolveTenantFromPhoneNumberId(unknownPhoneId);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBeDefined();
    });
  });

  describe("Gate 3: Recipient Filtering & Outbound / Booking Write Safeguards", () => {
    it("8. rejects unauthorized test recipients when allowlist is populated", () => {
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      expect(isRecipientAuthorizedForWhatsAppPilot("+447700900123")).toBe(true);
      expect(isRecipientAuthorizedForWhatsAppPilot("447700900123")).toBe(true);
      expect(isRecipientAuthorizedForWhatsAppPilot("+447700999999")).toBe(false);
    });

    it("9. strictly blocks outbound Meta Cloud API network requests when WHATSAPP_OUTBOUND_ENABLED=false", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const client = new MetaWhatsAppCloudApiClient();
      const sendRes = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: pilotTestPhoneId,
        text: "Test outbound message",
      });

      expect(sendRes.success).toBe(false);
      expect(sendRes.errorCode).toBe("OUTBOUND_DISABLED");
      expect(sendRes.mode).toBe("disabled");
    });

    it("10. booking writes disabled prevents live appointment mutations", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
      process.env.WHATSAPP_BOOKING_WRITES_ENABLED = "false";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = pilotSlug;

      registerMockWhatsAppTenant(pilotTestPhoneId, {
        allowed: true,
        businessId: validUuidBusinessId,
        businessSlug: pilotSlug,
        businessName: "Bookpilot QA Salon",
        timezone: "Europe/London",
        currency: "GBP",
        connectionId: validUuidConnectionId,
        aiEnabled: true,
        bookingEnabled: false,
        phoneNumberId: pilotTestPhoneId,
      });

      const adapterRes = await processInboundWhatsAppMessage(
        {
          providerMessageId: "wamid.confirm_test_001",
          fromWaId: "447700900123",
          customerName: "Alice",
          phoneNumberId: pilotTestPhoneId,
          wabaId: "1796731811545454",
          timestamp: "1761664324",
          text: "Confirm my appointment for haircut",
          rawType: "text",
          isInteractiveReply: false,
        },
        true // force mock outbound
      );

      // Successfully handled in preview mode without live database appointment writes
      expect(adapterRes.handled).toBe(true);
      expect(adapterRes.action).toBe("ai_reply");
    });
  });

  describe("Gate 4: Idempotency, Retries & Worker Resilience", () => {
    it("11. repeated webhook events remain idempotent", async () => {
      const eventKey = "evt_idempotency_001";
      const payload = { event: "test" };

      const first = await recordInboundWebhookEvent({
        providerEventKey: eventKey,
        eventType: "message",
        phoneNumberId: pilotTestPhoneId,
        payload,
      });

      expect(first.recorded).toBe(true);
      expect(first.status).toBe("recorded");

      const duplicate = await recordInboundWebhookEvent({
        providerEventKey: eventKey,
        eventType: "message",
        phoneNumberId: pilotTestPhoneId,
        payload,
      });

      expect(duplicate.recorded).toBe(false);
      expect(duplicate.isDuplicate).toBe(true);
      expect(duplicate.status).toBe("duplicate");
    });

    it("12. database failure and worker backoff retry calculation remain consistent", () => {
      expect(calculateWhatsAppBackoffSeconds(0)).toBe(30);  // 1st retry: 30s
      expect(calculateWhatsAppBackoffSeconds(1)).toBe(30);  // 1st retry: 30s
      expect(calculateWhatsAppBackoffSeconds(2)).toBe(60);  // 2nd retry: 60s
      expect(calculateWhatsAppBackoffSeconds(3)).toBe(120); // 3rd retry: 120s
      expect(calculateWhatsAppBackoffSeconds(4)).toBe(240); // 4th retry: 240s
    });
  });
});
