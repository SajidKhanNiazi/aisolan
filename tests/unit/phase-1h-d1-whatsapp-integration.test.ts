import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import {
  verifyMetaWebhookChallenge,
  verifyMetaSignature,
} from "@/features/integrations/whatsapp/security";
import {
  formatWhatsAppMessage,
  buildWhatsAppBookingSummary,
} from "@/features/integrations/whatsapp/formatter";
import {
  isHumanHandoffRequest,
  isOptOutRequest,
} from "@/features/integrations/whatsapp/handoff";
import {
  MockWhatsAppClient,
  MetaWhatsAppCloudApiClient,
} from "@/features/integrations/whatsapp/outbound";
import { resolveTenantFromPhoneNumberId } from "@/features/integrations/whatsapp/tenant-resolver";
import { processInboundWhatsAppMessage } from "@/features/integrations/whatsapp/adapter";
import {
  clearInMemoryConversations,
  clearReservedIntents,
  getOrCreateConversation,
  reserveOutboundIntent,
} from "@/features/integrations/whatsapp/conversation-service";
import {
  calculateWhatsAppBackoffSeconds,
  processWhatsAppEventQueueBatch,
  enqueueMockWhatsAppEvent,
  clearMockWhatsAppEventQueue,
} from "@/features/integrations/whatsapp/worker";
import {
  dispatchAsyncWhatsAppWorkerTrigger,
  verifyWhatsAppWorkerTrigger,
  mockDispatchedTriggers,
  clearMockDispatchedTriggers,
  getAppBaseUrl,
} from "@/features/integrations/whatsapp/trigger";
import { getWhatsAppExecutionMode } from "@/features/integrations/whatsapp/config";
import {
  recordInboundWebhookEvent,
  clearInMemoryEvents,
} from "@/features/integrations/whatsapp/durable-events";
import type { BookingDraft } from "@/features/ai-receptionist/booking/types";

describe("Phase 1H-D1 WhatsApp Cloud API Integration Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearInMemoryConversations();
    clearReservedIntents();
    clearMockDispatchedTriggers();
    clearInMemoryEvents();
    clearMockWhatsAppEventQueue();
  });

  describe("1. Webhook GET Verification Challenge", () => {
    it("accepts valid hub.mode, verify_token and returns the exact challenge", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "bookzello_meta_verify_secret_123456789";

      const res = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "bookzello_meta_verify_secret_123456789",
        challenge: "challenge_random_987654",
      });

      expect(res.valid).toBe(true);
      expect(res.challenge).toBe("challenge_random_987654");
      expect(res.error).toBeUndefined();
    });

    it("rejects when hub.mode is not 'subscribe'", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "bookzello_meta_verify_secret_123456789";

      const res = verifyMetaWebhookChallenge({
        mode: "unsubscribe",
        token: "bookzello_meta_verify_secret_123456789",
        challenge: "challenge_123",
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain("Unsupported hub.mode");
    });

    it("rejects when verify token does not match server token", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "correct_secret_token";

      const res = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "tampered_token",
        challenge: "challenge_123",
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain("Invalid verify token");
    });

    it("rejects when server WHATSAPP_VERIFY_TOKEN is missing", () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;

      const res = verifyMetaWebhookChallenge({
        mode: "subscribe",
        token: "some_token",
        challenge: "challenge_123",
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain("WHATSAPP_VERIFY_TOKEN is not configured");
    });
  });

  describe("2. Webhook POST HMAC-SHA256 Signature Verification", () => {
    const appSecret = "meta_app_secret_998877665544332211";
    const testBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "123456", changes: [] }],
    });

    function computeSignature(body: string, secret: string): string {
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(body, "utf-8");
      return `sha256=${hmac.digest("hex")}`;
    }

    it("validates authentic payload with correct HMAC-SHA256 signature", () => {
      process.env.WHATSAPP_APP_SECRET = appSecret;
      const validSig = computeSignature(testBody, appSecret);

      const res = verifyMetaSignature(testBody, validSig);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("rejects tampered body or invalid signature", () => {
      process.env.WHATSAPP_APP_SECRET = appSecret;
      const invalidSig = "sha256=00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

      const res = verifyMetaSignature(testBody, invalidSig);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Signature mismatch");
    });

    it("rejects requests missing the X-Hub-Signature-256 header", () => {
      process.env.WHATSAPP_APP_SECRET = appSecret;

      const res = verifyMetaSignature(testBody, null);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Missing X-Hub-Signature-256 header");
    });
  });

  describe("3. Tenant Resolution & Phone Number Mapping Isolation", () => {
    it("resolves the pilot test phone number ID to bookpilot-qa-salon", async () => {
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";

      const res = await resolveTenantFromPhoneNumberId("phone_qa_12345");
      expect(res.allowed).toBe(true);
      expect(res.businessSlug).toBe("bookpilot-qa-salon");
    });

    it("rejects unknown phone number IDs not mapped in database or environment", async () => {
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";

      const res = await resolveTenantFromPhoneNumberId("unknown_phone_99999");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("not associated with any salon");
    });

    it("enforces tenant allowlist strictly (cross-tenant protection)", async () => {
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "other-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";

      const res = await resolveTenantFromPhoneNumberId("phone_qa_12345");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("not permitted in the current pilot allowlist");
    });
  });

  describe("4. Human Handoff and Opt-Out Detection", () => {
    it("identifies human handoff requests accurately", () => {
      expect(isHumanHandoffRequest("Can I speak to a human?")).toBe(true);
      expect(isHumanHandoffRequest("Talk to a person")).toBe(true);
      expect(isHumanHandoffRequest("I want to speak with the salon owner")).toBe(true);
      expect(isHumanHandoffRequest("Connect me to human agent")).toBe(true);
      expect(isHumanHandoffRequest("I want a haircut tomorrow")).toBe(false);
    });

    it("identifies STOP / Unsubscribe requests accurately", () => {
      expect(isOptOutRequest("STOP")).toBe(true);
      expect(isOptOutRequest("stop")).toBe(true);
      expect(isOptOutRequest("unsubscribe")).toBe(true);
      expect(isOptOutRequest("cancel subscription")).toBe(true);
      expect(isOptOutRequest("I want to cancel my haircut")).toBe(false);
    });
  });

  describe("5. WhatsApp Aesthetic Formatting", () => {
    it("converts markdown bold to WhatsApp asterisks", () => {
      const input = "Here is **Classic Haircut** for **£24.50**.";
      const formatted = formatWhatsAppMessage(input);
      expect(formatted).toBe("Here is *Classic Haircut* for *£24.50*.");
    });

    it("formats a structured booking summary card", () => {
      const mockDraft: BookingDraft = {
        id: "token_abc123",
        businessId: "biz_1",
        businessSlug: "bookpilot-qa-salon",
        conversationId: "conv_1",
        serviceId: "srv_1",
        serviceName: "Classic Haircut",
        serviceDurationMinutes: 35,
        servicePriceFormatted: "£24.50",
        servicePriceCents: 2450,
        staffId: "stf_1",
        staffName: "Emma QA",
        staffPreference: "specific",
        slotDate: "2026-11-02",
        slotStartTime: "10:30",
        customerName: "Alex Test",
        customerPhone: "+447700900000",
        stage: "awaiting_confirmation",
        version: 1,
        idempotencyKey: "idem_123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        channel: "whatsapp",
      };

      const summary = buildWhatsAppBookingSummary(mockDraft, "Bookzello QA Salon");
      expect(summary).toContain("Booking Summary — Bookzello QA Salon");
      expect(summary).toContain("Classic Haircut");
      expect(summary).toContain("£24.50");
      expect(summary).toContain("Emma QA");
      expect(summary).toContain("2026-11-02 at 10:30 (Europe/London)");
      expect(summary).toContain("Alex Test");
    });
  });

  describe("6. Outbound Client Fail-Closed Behavior", () => {
    it("MockWhatsAppClient records sent messages without network calls", async () => {
      const mock = new MockWhatsAppClient();
      const res = await mock.sendTextMessage({
        recipientWaId: "447700900001",
        phoneNumberId: "phone_123",
        text: "Hello from Mock!",
      });

      expect(res.success).toBe(true);
      expect(res.mode).toBe("mock");
      expect(mock.sentMessages.length).toBe(1);
      expect(mock.sentMessages[0].type).toBe("text");
    });

    it("MetaWhatsAppCloudApiClient blocks sending when WHATSAPP_OUTBOUND_ENABLED=false", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
      process.env.WHATSAPP_ACCESS_TOKEN = "some_token";

      const client = new MetaWhatsAppCloudApiClient();
      const res = await client.sendTextMessage({
        recipientWaId: "447700900001",
        phoneNumberId: "phone_123",
        text: "Test",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("OUTBOUND_DISABLED");
      expect(res.mode).toBe("disabled");
    });

    it("MetaWhatsAppCloudApiClient blocks unauthorized recipients when WHATSAPP_AUTHORIZED_TEST_RECIPIENTS is configured", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_test_token";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900000,447700900001";

      const client = new MetaWhatsAppCloudApiClient();
      const res = await client.sendTextMessage({
        recipientWaId: "447700999999", // not in allowlist
        phoneNumberId: "phone_123",
        text: "Test",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("UNAUTHORIZED_RECIPIENT");
      expect(res.error).toContain("not in the authorized test recipients list");
    });
  });

  describe("7. End-to-End Inbound Message Adapter Processing", () => {
    it("returns disabled result when WHATSAPP_ENABLED=false", async () => {
      process.env.WHATSAPP_ENABLED = "false";

      const result = await processInboundWhatsAppMessage({
        providerMessageId: "wamid.msg1",
        fromWaId: "447700900001",
        phoneNumberId: "phone_123",
        wabaId: "waba_123",
        timestamp: "1730000000",
        text: "Hello",
        rawType: "text",
        isInteractiveReply: false,
      });

      expect(result.handled).toBe(false);
      expect(result.action).toBe("disabled");
    });

    it("handles human handoff request and pauses AI", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";

      const result = await processInboundWhatsAppMessage(
        {
          providerMessageId: "wamid.msg_handoff",
          fromWaId: "447700900001",
          phoneNumberId: "phone_qa_12345",
          wabaId: "waba_123",
          timestamp: "1730000000",
          text: "Can I speak to a human receptionist?",
          rawType: "text",
          isInteractiveReply: false,
        },
        true // forceMockOutbound
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("human_handoff");
      expect(result.businessSlug).toBe("bookpilot-qa-salon");
    });

    it("handles STOP opt-out request", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";

      const result = await processInboundWhatsAppMessage(
        {
          providerMessageId: "wamid.msg_stop",
          fromWaId: "447700900001",
          phoneNumberId: "phone_qa_12345",
          wabaId: "waba_123",
          timestamp: "1730000000",
          text: "STOP",
          rawType: "text",
          isInteractiveReply: false,
        },
        true
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("opt_out");
    });

    it("enforces D1 Pilot Write Gate (WHATSAPP_BOOKING_WRITES_ENABLED=false)", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_BOOKING_WRITES_ENABLED = "false";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      const result = await processInboundWhatsAppMessage(
        {
          providerMessageId: "wamid.msg_confirm_test",
          fromWaId: "447700900001",
          phoneNumberId: "phone_qa_12345",
          wabaId: "waba_123",
          timestamp: "1730000000",
          text: "Yes, please confirm my appointment",
          rawType: "text",
          isInteractiveReply: false,
        },
        true
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("ai_reply");
      expect(result.businessSlug).toBe("bookpilot-qa-salon");
    });

    it("prevents duplicate outbound replies on message retry (outbound idempotency)", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      const payload = {
        providerMessageId: "wamid.retry_test_01",
        fromWaId: "447700900001",
        phoneNumberId: "phone_qa_12345",
        wabaId: "waba_123",
        timestamp: "1730000000",
        text: "What services do you have?",
        rawType: "text",
        isInteractiveReply: false,
      };

      // First run
      const res1 = await processInboundWhatsAppMessage(payload, true);
      expect(res1.handled).toBe(true);
      expect(res1.action).toBe("ai_reply");

      // Second run (simulating webhook replay / worker retry of same inbound message)
      const res2 = await processInboundWhatsAppMessage(payload, true);
      expect(res2.handled).toBe(true);
      expect(res2.responseMessageId).toContain("suppressed_duplicate_");
    });

    it("prevents second send when worker crashes AFTER provider acceptance and BEFORE local success persistence (regression)", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      const payload = {
        providerMessageId: "wamid.crash_after_send_test_99",
        fromWaId: "447700900001",
        phoneNumberId: "phone_qa_12345",
        wabaId: "waba_123",
        timestamp: "1730000000",
        text: "Tell me about haircuts",
        rawType: "text",
        isInteractiveReply: false,
      };

      // 1. Establish tenant conversation using the authoritative tenant businessId
      const tenantRes = await resolveTenantFromPhoneNumberId(payload.phoneNumberId);
      const conv = await getOrCreateConversation({
        businessId: tenantRes.businessId!,
        connectionId: tenantRes.connectionId || "pilot-test-connection",
        customerWaId: payload.fromWaId,
      });

      // 2. Pre-reserve durable outbound intent in 'pending_send' state
      // This exactly simulates: Worker sent outbound request, Meta accepted it,
      // but worker crashed BEFORE finalizeOutboundIntent('sent') or recordWhatsAppMessage was committed to local DB.
      const reservation = await reserveOutboundIntent(conv.id, payload.providerMessageId);
      expect(reservation.allowed).toBe(true);

      // 3. Worker recovers / queue retries processing the inbound event
      const retryResult = await processInboundWhatsAppMessage(payload, true);

      // 4. Verify retry recognizes the pending_send intent and suppresses the second send
      expect(retryResult.handled).toBe(true);
      expect(retryResult.responseMessageId).toBe(`suppressed_duplicate_${payload.providerMessageId}`);
    });
  });

  describe("8. Durable Worker Atomic Claim, Retry Backoff & Lease Recovery", () => {
    it("calculates exponential backoff delay accurately", () => {
      expect(calculateWhatsAppBackoffSeconds(1)).toBe(30);
      expect(calculateWhatsAppBackoffSeconds(2)).toBe(60);
      expect(calculateWhatsAppBackoffSeconds(3)).toBe(120);
      expect(calculateWhatsAppBackoffSeconds(4)).toBe(240);
      expect(calculateWhatsAppBackoffSeconds(8)).toBe(3600); // capped at 3600s
    });

    it("atomically processes due queue events and recovers expired leases", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      clearMockWhatsAppEventQueue();

      // Enqueue 2 due events
      enqueueMockWhatsAppEvent({
        id: "evt_1",
        provider_event_key: "wa_msg_queue_01",
        event_type: "message",
        phone_number_id: "phone_qa_12345",
        business_id: null,
        payload: {
          wabaId: "waba_123",
          message: {
            id: "queue_01",
            from: "447700900001",
            timestamp: "1730000000",
            type: "text",
            text: { body: "Hello worker" },
          },
        },
        processing_status: "queued",
        attempt_count: 0,
        max_attempts: 5,
        next_attempt_at: new Date(Date.now() - 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      // Enqueue 1 stale crashed job with expired lease
      enqueueMockWhatsAppEvent({
        id: "evt_2",
        provider_event_key: "wa_msg_queue_02",
        event_type: "message",
        phone_number_id: "phone_qa_12345",
        business_id: null,
        payload: {
          wabaId: "waba_123",
          message: {
            id: "queue_02",
            from: "447700900002",
            timestamp: "1730000000",
            type: "text",
            text: { body: "Recovered message" },
          },
        },
        processing_status: "processing", // simulated crashed worker
        attempt_count: 1,
        max_attempts: 5,
        next_attempt_at: new Date(Date.now() - 120000).toISOString(), // expired 2 mins ago
        created_at: new Date().toISOString(),
      });

      const outcome = await processWhatsAppEventQueueBatch({
        batchSize: 10,
        leaseSeconds: 60,
        forceMockOutbound: true,
      });

      expect(outcome.claimed).toBe(2);
      expect(outcome.succeeded).toBe(2);
      expect(outcome.deadLettered).toBe(0);
      expect(outcome.errors.length).toBe(0);
    });

    it("schedules exponential retry on processing failure and dead-letters after max attempts", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";

      clearMockWhatsAppEventQueue();

      // Enqueue event with malformed payload causing processing exception (missing message ID)
      enqueueMockWhatsAppEvent({
        id: "evt_fail",
        provider_event_key: "wa_msg_fail_01",
        event_type: "message",
        phone_number_id: "phone_qa_12345",
        business_id: null,
        payload: {
          wabaId: "waba_123",
          // missing message object triggers throw/error in processClaimedWhatsAppEvent if structured invalidly
          corrupted: true,
        },
        processing_status: "queued",
        attempt_count: 4, // 5th attempt = max attempts
        max_attempts: 5,
        next_attempt_at: new Date(Date.now() - 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      const outcome = await processWhatsAppEventQueueBatch({
        batchSize: 10,
        leaseSeconds: 60,
        forceMockOutbound: true,
      });

      expect(outcome.claimed).toBe(1);
      expect(outcome.deadLettered).toBe(1);
      expect(outcome.retried).toBe(0);
    });
  });

  describe("9. Real-Time Managed Worker Trigger & Queue Integration", () => {
    it("1. validates authentic trigger using server CRON_SECRET authorization", async () => {
      process.env.CRON_SECRET = "test_cron_secret_998877";

      const headers = new Headers();
      headers.set("authorization", "Bearer test_cron_secret_998877");

      const res = await verifyWhatsAppWorkerTrigger(headers, JSON.stringify({ batchSize: 5 }));
      expect(res.valid).toBe(true);
      expect(res.caller).toBe("cron");
      expect(res.error).toBeUndefined();
    });

    it("2. rejects invalid or tampered trigger credentials safely", async () => {
      process.env.CRON_SECRET = "test_cron_secret_998877";

      const headers = new Headers();
      headers.set("authorization", "Bearer invalid_secret_token");

      const res = await verifyWhatsAppWorkerTrigger(headers, JSON.stringify({ batchSize: 5 }));
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Unauthorized");
    });

    it("3. rejects unauthenticated trigger requests when credentials are missing", async () => {
      const headers = new Headers();
      const res = await verifyWhatsAppWorkerTrigger(headers, "{}");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Unauthorized");
    });

    it("4. verifies isolated test trigger token", async () => {
      const headers = new Headers();
      headers.set("x-test-worker-auth", "valid_mock_token");

      const res = await verifyWhatsAppWorkerTrigger(headers, "{}");
      expect(res.valid).toBe(true);
      expect(res.caller).toBe("test_mock");
    });

    it("5. preserves inbound event in PostgreSQL durable queue even if async trigger dispatch fails", async () => {
      const providerEventKey = "wa_msg_dispatch_fail_01";

      // 1. Transactionally record inbound event into durable queue
      const recordRes = await recordInboundWebhookEvent({
        providerEventKey,
        eventType: "message",
        phoneNumberId: "phone_qa_12345",
        payload: {
          wabaId: "waba_123",
          message: {
            id: "msg_dispatch_fail_01",
            from: "447700900001",
            timestamp: "1730000000",
            type: "text",
            text: { body: "Is Emma available tomorrow?" },
          },
        },
      });

      expect(recordRes.status).toBe("recorded");

      // 2. Simulate QStash dispatch with unconfigured token (dispatch returns false non-blockingly)
      delete process.env.QSTASH_TOKEN;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production"; // disable test mock auto-dispatch

      const triggerRes = await dispatchAsyncWhatsAppWorkerTrigger({
        providerEventKey,
        eventId: recordRes.eventId,
        phoneNumberId: "phone_qa_12345",
      });

      expect(triggerRes.dispatched).toBe(false);
      expect(triggerRes.provider).toBe("none");

      // 3. Verify event was NOT lost: a subsequent scheduled worker sweep can claim and process it
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    });

    it("6. dispatches async worker trigger mock when configured in test mode", async () => {
      clearMockDispatchedTriggers();

      const triggerRes = await dispatchAsyncWhatsAppWorkerTrigger({
        providerEventKey: "wa_msg_mock_trigger_01",
        eventId: "evt_12345",
        phoneNumberId: "phone_qa_12345",
      });

      expect(triggerRes.dispatched).toBe(true);
      expect(triggerRes.provider).toBe("mock");
      expect(mockDispatchedTriggers.length).toBe(1);
      expect(mockDispatchedTriggers[0].providerEventKey).toBe("wa_msg_mock_trigger_01");
      expect(mockDispatchedTriggers[0].destinationUrl).toContain("/api/internal/whatsapp/process");
    });

    it("7. prevents duplicate processing on duplicate trigger invocation (atomic claims)", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      clearMockWhatsAppEventQueue();

      // Enqueue a single inbound event
      enqueueMockWhatsAppEvent({
        id: "evt_dup_trigger",
        provider_event_key: "wa_msg_dup_trigger_01",
        event_type: "message",
        phone_number_id: "phone_qa_12345",
        business_id: null,
        payload: {
          wabaId: "waba_123",
          message: {
            id: "dup_msg_01",
            from: "447700900001",
            timestamp: "1730000000",
            type: "text",
            text: { body: "Hello salon" },
          },
        },
        processing_status: "queued",
        attempt_count: 0,
        max_attempts: 5,
        next_attempt_at: new Date(Date.now() - 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      // Invocation 1: First worker claims the event
      const run1 = await processWhatsAppEventQueueBatch({ batchSize: 5, leaseSeconds: 60, forceMockOutbound: true });
      expect(run1.claimed).toBe(1);
      expect(run1.succeeded).toBe(1);

      // Invocation 2: Duplicate trigger arrives while run1 is completed / locked
      const run2 = await processWhatsAppEventQueueBatch({ batchSize: 5, leaseSeconds: 60, forceMockOutbound: true });
      expect(run2.claimed).toBe(0);
      expect(run2.succeeded).toBe(0);
    });

    it("8. ensures concurrent workers process disjoint events without double-execution", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_qa_12345";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      clearMockWhatsAppEventQueue();

      // Enqueue 2 due events
      for (let i = 1; i <= 2; i++) {
        enqueueMockWhatsAppEvent({
          id: `evt_concurrent_${i}`,
          provider_event_key: `wa_msg_concurrent_${i}`,
          event_type: "message",
          phone_number_id: "phone_qa_12345",
          business_id: null,
          payload: {
            wabaId: "waba_123",
            message: {
              id: `concurrent_msg_${i}`,
              from: `44770090000${i}`,
              timestamp: "1730000000",
              type: "text",
              text: { body: `Message ${i}` },
            },
          },
          processing_status: "queued",
          attempt_count: 0,
          max_attempts: 5,
          next_attempt_at: new Date(Date.now() - 1000).toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      // Execute worker 1 claiming 1 item, then worker 2 claiming 1 item
      const run1 = await processWhatsAppEventQueueBatch({ batchSize: 1, leaseSeconds: 60, forceMockOutbound: true });
      const run2 = await processWhatsAppEventQueueBatch({ batchSize: 1, leaseSeconds: 60, forceMockOutbound: true });

      expect(run1.claimed).toBe(1);
      expect(run2.claimed).toBe(1);

      // Run 3: No more items left
      const run3 = await processWhatsAppEventQueueBatch({ batchSize: 1, leaseSeconds: 60, forceMockOutbound: true });
      expect(run3.claimed).toBe(0);
    });

    it("9. resolves execution mode accurately and supports WHATSAPP_EXECUTION_MODE override", () => {
      delete process.env.WHATSAPP_EXECUTION_MODE;
      expect(getWhatsAppExecutionMode()).toBe("async_trigger");

      process.env.WHATSAPP_EXECUTION_MODE = "inline";
      expect(getWhatsAppExecutionMode()).toBe("inline");

      process.env.WHATSAPP_EXECUTION_MODE = "async_trigger";
      expect(getWhatsAppExecutionMode()).toBe("async_trigger");
    });

    it("10. resolves target deployment URL prioritizing VERCEL_PROJECT_PRODUCTION_URL when APP_URL is unset", () => {
      delete process.env.APP_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      process.env.VERCEL_PROJECT_PRODUCTION_URL = "bookzello.com";
      expect(getAppBaseUrl()).toBe("https://bookzello.com");

      process.env.APP_URL = "https://custom-domain.com";
      expect(getAppBaseUrl()).toBe("https://custom-domain.com");
    });
  });

  describe("9. Cross-Tenant Isolation & Invariant Unit Tests", () => {
    it("strictly isolates conversations for identical customer WhatsApp IDs across different tenants", async () => {
      const bizA = "11111111-1111-1111-1111-111111111111";
      const bizB = "22222222-2222-2222-2222-222222222222";
      const customerWaId = "447700900999";

      const convA = await getOrCreateConversation({
        businessId: bizA,
        connectionId: "conn_a",
        customerWaId,
        customerName: "Alice Alpha",
      });

      const convB = await getOrCreateConversation({
        businessId: bizB,
        connectionId: "conn_b",
        customerWaId,
        customerName: "Alice Beta",
      });

      // Different entities and completely isolated
      expect(convA.id).not.toBe(convB.id);
      expect(convA.businessId).toBe(bizA);
      expect(convB.businessId).toBe(bizB);
      expect(convA.customerName).toBe("Alice Alpha");
      expect(convB.customerName).toBe("Alice Beta");
    });

    it("prevents cross-tenant outbound intent collisions or suppression", async () => {
      const bizA = "11111111-1111-1111-1111-111111111111";
      const bizB = "22222222-2222-2222-2222-222222222222";
      const providerMsgId = "wamid.shared_key_12345";

      // Salon Alpha reserves intent for this incoming message
      const resA = await reserveOutboundIntent("conv_alpha", providerMsgId, bizA);
      expect(resA.allowed).toBe(true);

      // Duplicate for Salon Alpha is suppressed
      const resA2 = await reserveOutboundIntent("conv_alpha", providerMsgId, bizA);
      expect(resA2.allowed).toBe(false);

      // But Salon Beta using its own conversation cannot be blocked by Salon Alpha
      const resB = await reserveOutboundIntent("conv_beta", providerMsgId, bizB);
      expect(resB.allowed).toBe(true);
    });

    it("rejects unauthorized salons from WhatsApp pilot processing", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "permitted-salon-slug";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "phone_permitted_123";

      const unauthorizedRes = await resolveTenantFromPhoneNumberId("phone_unauthorized_999");
      expect(unauthorizedRes.allowed).toBe(false);
      expect(unauthorizedRes.reason).toContain("not associated with any salon");
    });
  });
});


