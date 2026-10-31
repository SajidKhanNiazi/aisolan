/**
 * Bookzello — Phase 1H-D1 WhatsApp Channel Adapter
 * Bridges WhatsApp incoming messages to the authoritative AI Receptionist booking engine.
 * Observes WHATSAPP_BOOKING_WRITES_ENABLED=false (D1 Read-Only Pilot).
 */

import { resolveTenantFromPhoneNumberId } from "./tenant-resolver";
import {
  getOrCreateConversation,
  recordWhatsAppMessage,
  updateConversationDraftId,
  getRecentConversationHistory,
  reserveOutboundIntent,
  finalizeOutboundIntent,
} from "./conversation-service";
import { isHumanHandoffRequest, isOptOutRequest, executeHumanHandoff, executeOptOut } from "./handoff";
import { formatWhatsAppMessage, buildWhatsAppBookingSummary } from "./formatter";
import { getWhatsAppOutboundClient } from "./outbound";
import { isWhatsAppEnabled, isWhatsAppBookingWritesEnabled } from "./config";
import { processCustomerAiChat } from "@/features/ai-receptionist/server";
import type { InboundMessageContext } from "./types";
import type { ChatMessage } from "@/features/ai-receptionist/types";

export interface WhatsAppProcessingResult {
  handled: boolean;
  action: "ai_reply" | "human_handoff" | "opt_out" | "ignored" | "disabled" | "error";
  businessSlug?: string;
  conversationId?: string;
  responseMessageId?: string;
  error?: string;
}

/**
 * Core entrypoint for processing an inbound WhatsApp message.
 */
export async function processInboundWhatsAppMessage(
  context: InboundMessageContext,
  forceMockOutbound = false
): Promise<WhatsAppProcessingResult> {
  if (!isWhatsAppEnabled()) {
    return {
      handled: false,
      action: "disabled",
      error: "WhatsApp integration is disabled (WHATSAPP_ENABLED=false)",
    };
  }

  // 1. Resolve tenant from recipient phone number ID
  const tenantResolution = await resolveTenantFromPhoneNumberId(context.phoneNumberId);
  if (!tenantResolution.allowed || !tenantResolution.businessId || !tenantResolution.businessSlug) {
    return {
      handled: false,
      action: "ignored",
      error: tenantResolution.reason || "Tenant not permitted or unknown phone number",
    };
  }

  const { businessId, businessSlug, connectionId } = tenantResolution;
  const outboundClient = getWhatsAppOutboundClient(forceMockOutbound);

  // 2. Load or initialize tenant-scoped conversation
  let conversation;
  try {
    conversation = await getOrCreateConversation({
      businessId,
      connectionId: connectionId || `conn_${context.phoneNumberId}`,
      customerWaId: context.fromWaId,
      customerName: context.customerName,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load conversation record";
    return {
      handled: false,
      action: "error",
      businessSlug,
      error: msg,
    };
  }

  // 3. Persist inbound message in audit history
  await recordWhatsAppMessage({
    businessId,
    conversationId: conversation.id,
    providerMessageId: context.providerMessageId,
    direction: "inbound",
    messageType: context.isInteractiveReply ? "interactive_button" : "text",
    sanitizedContent: context.text,
    deliveryStatus: "received",
    providerTimestamp: context.timestamp,
  });

  // 4. Check for STOP / Opt-Out request
  if (isOptOutRequest(context.text)) {
    await executeOptOut(conversation.id);
    const replyText =
      "You have been unsubscribed from automated messages. You will no longer receive AI updates from this salon. Reply START to opt back in.";

    const sendRes = await outboundClient.sendTextMessage({
      recipientWaId: context.fromWaId,
      phoneNumberId: context.phoneNumberId,
      text: replyText,
    });

    await recordWhatsAppMessage({
      businessId,
      conversationId: conversation.id,
      providerMessageId: sendRes.messageId || `out_${Date.now()}`,
      direction: "outbound",
      messageType: "text",
      sanitizedContent: replyText,
      deliveryStatus: sendRes.success ? "sent" : "failed",
      providerTimestamp: new Date().toISOString(),
      errorCode: sendRes.errorCode,
      errorMessage: sendRes.error,
    });

    return {
      handled: true,
      action: "opt_out",
      businessSlug,
      conversationId: conversation.id,
      responseMessageId: sendRes.messageId,
    };
  }

  // 5. Check for Human Handoff request
  if (isHumanHandoffRequest(context.text)) {
    await executeHumanHandoff(conversation.id, "Customer requested human receptionist via WhatsApp");
    const handoffText =
      "I have connected you with the salon team. A staff member will respond to you directly here shortly. (AI assistant paused)";

    const sendRes = await outboundClient.sendTextMessage({
      recipientWaId: context.fromWaId,
      phoneNumberId: context.phoneNumberId,
      text: handoffText,
    });

    await recordWhatsAppMessage({
      businessId,
      conversationId: conversation.id,
      providerMessageId: sendRes.messageId || `out_${Date.now()}`,
      direction: "outbound",
      messageType: "text",
      sanitizedContent: handoffText,
      deliveryStatus: sendRes.success ? "sent" : "failed",
      providerTimestamp: new Date().toISOString(),
      errorCode: sendRes.errorCode,
      errorMessage: sendRes.error,
    });

    return {
      handled: true,
      action: "human_handoff",
      businessSlug,
      conversationId: conversation.id,
      responseMessageId: sendRes.messageId,
    };
  }

  // 6. If conversation is in human handoff or paused, do not reply with AI
  if (conversation.aiMode === "human_handoff" || conversation.aiMode === "paused") {
    return {
      handled: true,
      action: "ignored",
      businessSlug,
      conversationId: conversation.id,
    };
  }

  // 7. Load recent conversation messages to feed into AI
  const recentMessages = await getRecentConversationHistory(conversation.id, 10);
  const aiMessages: ChatMessage[] = [...recentMessages];

  // Append latest message
  aiMessages.push({
    role: "user",
    content: context.text,
  });

  // 8. Invoke shared Bookzello AI Receptionist service
  const aiResponse = await processCustomerAiChat(
    {
      businessSlug,
      messages: aiMessages,
      draftToken: conversation.durableBookingDraftId || undefined,
      channel: "whatsapp",
    },
    `wa:${context.fromWaId}`
  );

  let rawReplyText = aiResponse.message || "I'm sorry, I couldn't process your request right now. Please try again.";

  // 9. D1 Safety Gate: If booking write was attempted or draft reached confirmation
  if (aiResponse.draft?.stage === "awaiting_confirmation" || aiResponse.draft?.stage === "confirming") {
    // Format full booking summary
    const summaryCard = buildWhatsAppBookingSummary(aiResponse.draft, "Bookzello QA Salon");
    rawReplyText = `${summaryCard}\n\n*Note (D1 Pilot Mode):* Real appointment creation is currently in preview mode (WHATSAPP_BOOKING_WRITES_ENABLED=false). No live booking will be charged or confirmed.`;
  }

  // If customer asked to confirm and booking writes are disabled
  if (!isWhatsAppBookingWritesEnabled() && /confirm|book it|yes please|go ahead/i.test(context.text)) {
    if (aiResponse.draft) {
      rawReplyText = `Your reservation details have been verified in test mode. Live appointment writes are currently paused for this pilot (WHATSAPP_BOOKING_WRITES_ENABLED=false). No real appointment was booked.`;
    }
  }

  // 10. Durable Outbound Intent Guard: prevent duplicate outbound sends during crashes or worker retries
  const intentReservation = await reserveOutboundIntent(conversation.id, context.providerMessageId, businessId);
  if (!intentReservation.allowed) {
    return {
      handled: true,
      action: "ai_reply",
      businessSlug,
      conversationId: conversation.id,
      responseMessageId: `suppressed_duplicate_${context.providerMessageId}`,
    };
  }

  // 11. Format message for WhatsApp aesthetics
  const formattedReply = formatWhatsAppMessage(rawReplyText);

  // 12. Send reply via outbound client with error boundary for ambiguous outcomes
  let sendRes;
  try {
    sendRes = await outboundClient.sendTextMessage({
      recipientWaId: context.fromWaId,
      phoneNumberId: context.phoneNumberId,
      text: formattedReply,
    });
  } catch (sendErr: unknown) {
    // Crash or network timeout during/after HTTP post to provider: mark ambiguous to prevent blind automatic resend
    await finalizeOutboundIntent(conversation.id, context.providerMessageId, "ambiguous_outcome");
    throw sendErr;
  }

  // 13. Finalize outbound intent and record outbound audit
  const outboundMessageId = sendRes.messageId || `out_for_${context.providerMessageId}`;
  await finalizeOutboundIntent(
    conversation.id,
    context.providerMessageId,
    sendRes.success ? "sent" : "failed",
    outboundMessageId
  );

  await recordWhatsAppMessage({
    businessId,
    conversationId: conversation.id,
    providerMessageId: outboundMessageId,
    direction: "outbound",
    messageType: "text",
    sanitizedContent: formattedReply,
    deliveryStatus: sendRes.success ? "sent" : "failed",
    providerTimestamp: new Date().toISOString(),
    errorCode: sendRes.errorCode,
    errorMessage: sendRes.error,
  });

  const effectiveDraftToken = aiResponse.draftToken || aiResponse.draft?.id;
  if (effectiveDraftToken) {
    await updateConversationDraftId(conversation.id, effectiveDraftToken);
  }

  return {
    handled: true,
    action: "ai_reply",
    businessSlug,
    conversationId: conversation.id,
    responseMessageId: sendRes.messageId,
  };
}
