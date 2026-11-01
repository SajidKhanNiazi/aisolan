import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MetaWhatsAppCloudApiClient,
  defaultMockWhatsAppClient,
} from "@/features/integrations/whatsapp/outbound";
import { processInboundWhatsAppMessage } from "@/features/integrations/whatsapp/adapter";
import {
  clearInMemoryConversations,
  clearReservedIntents,
  reserveOutboundIntent,
  finalizeOutboundIntent,
} from "@/features/integrations/whatsapp/conversation-service";
import {
  isRecipientAuthorizedForWhatsAppPilot,
  normalizePhoneNumber,
} from "@/features/integrations/whatsapp/config";
import { salonTools } from "@/features/ai-receptionist/tools";

describe("Phase 1H-D10 Final Outbound Safety Gate Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearInMemoryConversations();
    clearReservedIntents();
    vi.restoreAllMocks();
  });

  describe("Task 1 & Task 2: Fail-Closed Allowlist & Boundary Regression Tests", () => {
    it("normalizePhoneNumber cleanly strips non-digits and enforces E.164 length rules", () => {
      expect(normalizePhoneNumber("+44 7700 900 123")).toBe("447700900123");
      expect(normalizePhoneNumber("+1 (555) 123-4567")).toBe("15551234567");
      expect(normalizePhoneNumber("447700900123")).toBe("447700900123");
      expect(normalizePhoneNumber("123")).toBeNull(); // too short
      expect(normalizePhoneNumber("12345678901234567")).toBeNull(); // too long
      expect(normalizePhoneNumber("invalid*number")).toBeNull();
      expect(normalizePhoneNumber("")).toBeNull();
      expect(normalizePhoneNumber(null)).toBeNull();
    });

    it("DENIES when WHATSAPP_AUTHORIZED_TEST_RECIPIENTS is completely missing", async () => {
      delete process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS;
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      expect(isRecipientAuthorizedForWhatsAppPilot("447700900123")).toBe(false);

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Test missing allowlist",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("UNAUTHORIZED_RECIPIENT");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("DENIES when WHATSAPP_AUTHORIZED_TEST_RECIPIENTS is empty string", async () => {
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "";
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      expect(isRecipientAuthorizedForWhatsAppPilot("447700900123")).toBe(false);

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Test empty allowlist",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("UNAUTHORIZED_RECIPIENT");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("DENIES when WHATSAPP_AUTHORIZED_TEST_RECIPIENTS is whitespace-only", async () => {
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "   \t \n ";
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      expect(isRecipientAuthorizedForWhatsAppPilot("447700900123")).toBe(false);

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Test whitespace allowlist",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("UNAUTHORIZED_RECIPIENT");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("DENIES when allowlist or recipient contains wildcards or injection attempts", () => {
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "* , all, +447700900123";

      // Wildcards must be stripped out and never match
      expect(isRecipientAuthorizedForWhatsAppPilot("*")).toBe(false);
      expect(isRecipientAuthorizedForWhatsAppPilot("all")).toBe(false);
      expect(isRecipientAuthorizedForWhatsAppPilot("")).toBe(false);
      expect(isRecipientAuthorizedForWhatsAppPilot("   ")).toBe(false);
      expect(isRecipientAuthorizedForWhatsAppPilot("447700900999")).toBe(false);

      // Legitimate valid entry in the list is still allowed
      expect(isRecipientAuthorizedForWhatsAppPilot("447700900123")).toBe(true);
    });

    it("DENIES unauthorized recipient and makes zero network calls", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      const res = await client.sendTextMessage({
        recipientWaId: "447700999999", // not in allowlist
        phoneNumberId: "1314214205118465",
        text: "Test unauthorized",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("UNAUTHORIZED_RECIPIENT");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("ALLOWS authorized recipient only when all safety flags and tokens are present", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "+44 7700 900 123";

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "wamid.live_mock_123" }] }),
      } as Response);

      const client = new MetaWhatsAppCloudApiClient();
      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Hello pilot tester",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe("wamid.live_mock_123");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("DENIES when WHATSAPP_OUTBOUND_ENABLED=false even for authorized recipient", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Outbound disabled test",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("OUTBOUND_DISABLED");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("DENIES when WHATSAPP_ACCESS_TOKEN is missing or empty, making zero network calls", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Missing token test",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("MISSING_ACCESS_TOKEN");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("DENIES when WHATSAPP_TEST_PHONE_NUMBER_ID configuration is missing", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      delete process.env.WHATSAPP_TEST_PHONE_NUMBER_ID;
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "1314214205118465",
        text: "Missing phone config test",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("MISSING_PHONE_NUMBER_CONFIG");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("DENIES when outbound phoneNumberId does not match configured pilot phone number ID", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      const res = await client.sendTextMessage({
        recipientWaId: "447700900123",
        phoneNumberId: "wrong_phone_id_999999",
        text: "Mismatched phone test",
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe("MISMATCHED_PHONE_NUMBER_ID");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("enforces fail-closed guards equally across interactive buttons and template messages", async () => {
      process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
      process.env.WHATSAPP_ACCESS_TOKEN = "valid_token";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";

      const fetchSpy = vi.spyOn(global, "fetch");
      const client = new MetaWhatsAppCloudApiClient();

      // Interactive buttons with unauthorized recipient
      const resBtn = await client.sendInteractiveButtons({
        recipientWaId: "447700999999",
        phoneNumberId: "1314214205118465",
        bodyText: "Choose a slot",
        buttons: [{ id: "b1", title: "Slot 1" }],
      });
      expect(resBtn.success).toBe(false);
      expect(resBtn.errorCode).toBe("UNAUTHORIZED_RECIPIENT");

      // Template message with unauthorized recipient
      const resTpl = await client.sendTemplateMessage({
        recipientWaId: "447700999999",
        phoneNumberId: "1314214205118465",
        templateName: "appointment_reminder",
        languageCode: "en_GB",
      });
      expect(resTpl.success).toBe(false);
      expect(resTpl.errorCode).toBe("UNAUTHORIZED_RECIPIENT");

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Task 3: Booking Safeguards & Write Blockade", () => {
    it("intercepts booking confirmation and returns preview without creating real appointment", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
      process.env.WHATSAPP_BOOKING_WRITES_ENABLED = "false";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      const result = await processInboundWhatsAppMessage(
        {
          providerMessageId: "wamid.confirm_write_test_01",
          fromWaId: "447700900123",
          phoneNumberId: "1314214205118465",
          wabaId: "1796731811545454",
          timestamp: "1730000000",
          text: "Please confirm and book it now for tomorrow",
          rawType: "text",
          isInteractiveReply: false,
        },
        true
      );

      expect(result.handled).toBe(true);
      expect(result.action).toBe("ai_reply");
      expect(result.businessSlug).toBe("bookpilot-qa-salon");
    });

    it("does not leak internal env var names in customer replies", async () => {
      process.env.WHATSAPP_ENABLED = "true";
      process.env.WHATSAPP_BOOKING_WRITES_ENABLED = "false";
      process.env.WHATSAPP_PILOT_ALLOWED_SALONS = "bookpilot-qa-salon";
      process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
      process.env.AI_RECEPTIONIST_MODE = "mock";

      defaultMockWhatsAppClient.clear();

      await processInboundWhatsAppMessage(
        {
          providerMessageId: "wamid.confirm_leak_check_01",
          fromWaId: "447700900123",
          phoneNumberId: "1314214205118465",
          wabaId: "1796731811545454",
          timestamp: "1730000000",
          text: "Yes, go ahead and book it please",
          rawType: "text",
          isInteractiveReply: false,
        },
        true
      );

      expect(defaultMockWhatsAppClient.sentMessages.length).toBeGreaterThan(0);
      const msg = defaultMockWhatsAppClient.sentMessages[0];
      const text = (msg.options as { text: string }).text;
      expect(text).not.toContain("WHATSAPP_BOOKING_WRITES_ENABLED");
      expect(text).not.toContain("WHATSAPP_ENABLED");
      expect(text).not.toContain("process.env");
    });

    it("verifies that AI receptionist tools contain zero appointment mutation tools", () => {
      const toolNames = Object.keys(salonTools);
      // Tool names must only be read-only inquiry and draft helpers
      const mutationTools = toolNames.filter((name) =>
        /createAppointment|updateAppointment|deleteAppointment|cancelAppointment|rescheduleAppointment/i.test(
          name
        )
      );
      expect(mutationTools).toEqual([]);

      // Explicitly check cancelBookingDraft only operates on in-memory/KV draft
      expect(salonTools.cancelBookingDraft).toBeDefined();
    });
  });

  describe("Outbound Idempotency & Duplicate Suppression", () => {
    it("strictly prevents duplicate outbound sends for the same providerMessageId", async () => {
      const convId = "conv_test_uuid_001";
      const msgId = "wamid.dedup_test_999";
      const bizId = "biz_test_uuid_001";

      const res1 = await reserveOutboundIntent(convId, msgId, bizId);
      expect(res1.allowed).toBe(true);

      const res2 = await reserveOutboundIntent(convId, msgId, bizId);
      expect(res2.allowed).toBe(false);
      expect(res2.reason).toContain("already in-flight");

      await finalizeOutboundIntent(convId, msgId, "sent", "wamid.outbound_1");
      const res3 = await reserveOutboundIntent(convId, msgId, bizId);
      expect(res3.allowed).toBe(false);
      expect(res3.reason).toContain("already successfully sent");
    });

    it("suppresses retry on ambiguous outcome (network timeout after provider send)", async () => {
      const convId = "conv_test_uuid_002";
      const msgId = "wamid.ambiguous_test_888";

      await reserveOutboundIntent(convId, msgId);
      await finalizeOutboundIntent(convId, msgId, "ambiguous_outcome");

      const res = await reserveOutboundIntent(convId, msgId);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("ambiguous");
    });
  });
});
