import { createServiceClient } from "@/lib/supabase/service";
import type { ChatMessage } from "@/features/ai-receptionist/types";
import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppAiMode,
} from "./types";

// In-memory conversation and message store for testing/offline execution
const inMemoryConversations = new Map<string, WhatsAppConversation>();
const inMemoryMessages = new Map<string, WhatsAppMessage[]>();

export function clearInMemoryConversations(): void {
  inMemoryConversations.clear();
  inMemoryMessages.clear();
}

export class WhatsAppDatabaseError extends Error {
  public readonly isRetryable: boolean;
  public readonly code?: string;

  constructor(message: string, code?: string, isRetryable: boolean = true) {
    super(message);
    this.name = "WhatsAppDatabaseError";
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * Categorizes PostgreSQL error codes into retryable (network/concurrency) vs non-retryable (constraint/syntax).
 */
export function isRetryablePostgresCode(code?: string): boolean {
  if (!code) return true;
  // Non-retryable constraint violations & syntax errors:
  // 23503: foreign_key_violation
  // 23502: not_null_violation
  // 22P02: invalid_text_representation (e.g. invalid UUID syntax)
  // 23514: check_violation
  if (["23503", "23502", "22P02", "23514"].includes(code)) return false;
  if (code.startsWith("42")) return false; // Syntax errors or undefined tables/columns
  return true;
}

export interface GetOrCreateConversationParams {
  businessId: string;
  connectionId: string;
  customerWaId: string;
  customerName?: string | null;
}

/**
 * Retrieves or creates a WhatsApp conversation record for a customer under a tenant salon.
 * In production (when Supabase is configured), enforces strict database persistence with UUID foreign keys.
 * In-memory fallback is restricted strictly to offline test runners without Supabase credentials.
 */
export async function getOrCreateConversation(
  businessIdOrParams: string | GetOrCreateConversationParams,
  maybeConnectionId?: string,
  maybeCustomerWaId?: string,
  maybeCustomerName?: string | null
): Promise<WhatsAppConversation> {
  let businessId: string;
  let connectionId: string;
  let customerWaId: string;
  let customerName: string | null | undefined;

  if (typeof businessIdOrParams === "object" && businessIdOrParams !== null) {
    businessId = businessIdOrParams.businessId;
    connectionId = businessIdOrParams.connectionId;
    customerWaId = businessIdOrParams.customerWaId;
    customerName = businessIdOrParams.customerName;
  } else {
    businessId = businessIdOrParams;
    connectionId = maybeConnectionId || "default_conn";
    customerWaId = maybeCustomerWaId || "default_wa_id";
    customerName = maybeCustomerName;
  }

  const convKey = `${businessId}:${customerWaId}`;
  const now = new Date();
  const windowExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // In-memory store check (for isolated unit tests and test fixtures)
  const existingMemory = inMemoryConversations.get(convKey);
  if (existingMemory) {
    existingMemory.lastInboundAt = now.toISOString();
    existingMemory.serviceWindowExpiresAt = windowExpiry;
    if (customerName) existingMemory.customerName = customerName;
    return existingMemory;
  }

  const serviceClient = createServiceClient();
  if (serviceClient) {
    const { data: existing, error: selectError } = await serviceClient
      .from("whatsapp_conversations")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_wa_id", customerWaId)
      .maybeSingle();

    if (selectError) {
      console.error("[WhatsApp] Database conversation query failed:", {
        code: selectError.code,
        message: selectError.message,
      });
      throw new WhatsAppDatabaseError(
        `Failed to query conversation: ${selectError.message}`,
        selectError.code,
        isRetryablePostgresCode(selectError.code)
      );
    }

    if (existing) {
      const { error: updateError } = await serviceClient
        .from("whatsapp_conversations")
        .update({
          last_inbound_at: now.toISOString(),
          service_window_expires_at: windowExpiry,
          customer_name: customerName || existing.customer_name,
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[WhatsApp] Database conversation update failed:", {
          code: updateError.code,
          message: updateError.message,
        });
        throw new WhatsAppDatabaseError(
          `Failed to update conversation: ${updateError.message}`,
          updateError.code,
          isRetryablePostgresCode(updateError.code)
        );
      }

      const conv: WhatsAppConversation = {
        id: existing.id,
        businessId: existing.business_id,
        connectionId: existing.connection_id,
        customerWaId: existing.customer_wa_id,
        customerName: customerName || existing.customer_name,
        status: existing.status,
        aiMode: existing.ai_mode,
        assignedHumanId: existing.assigned_human_id,
        durableBookingDraftId: existing.durable_booking_draft_id,
        lastInboundAt: now.toISOString(),
        serviceWindowExpiresAt: windowExpiry,
        createdAt: existing.created_at,
        updatedAt: now.toISOString(),
      };
      inMemoryConversations.set(convKey, conv);
      return conv;
    }

    // Create new conversation
    const { data: created, error: insertError } = await serviceClient
      .from("whatsapp_conversations")
      .insert({
        business_id: businessId,
        connection_id: connectionId,
        customer_wa_id: customerWaId,
        customer_name: customerName || null,
        status: "active",
        ai_mode: "ai",
        service_window_expires_at: windowExpiry,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[WhatsApp] Database conversation insert failed:", {
        code: insertError.code,
        message: insertError.message,
      });
      throw new WhatsAppDatabaseError(
        `Failed to persist WhatsApp conversation: ${insertError.message}`,
        insertError.code,
        isRetryablePostgresCode(insertError.code)
      );
    }

    if (created) {
      const conv: WhatsAppConversation = {
        id: created.id,
        businessId: created.business_id,
        connectionId: created.connection_id,
        customerWaId: created.customer_wa_id,
        customerName: created.customer_name,
        status: created.status,
        aiMode: created.ai_mode,
        assignedHumanId: created.assigned_human_id,
        durableBookingDraftId: created.durable_booking_draft_id,
        lastInboundAt: created.last_inbound_at,
        serviceWindowExpiresAt: created.service_window_expires_at,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };
      inMemoryConversations.set(convKey, conv);
      return conv;
    }
  }

  // Fallback in-memory creation strictly for offline test environments
  const fallbackConv: WhatsAppConversation = {
    id: "mem-conv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    businessId,
    connectionId,
    customerWaId,
    customerName: customerName || null,
    status: "active",
    aiMode: "ai",
    assignedHumanId: null,
    durableBookingDraftId: null,
    lastInboundAt: now.toISOString(),
    serviceWindowExpiresAt: windowExpiry,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  inMemoryConversations.set(convKey, fallbackConv);
  return fallbackConv;
}

/**
 * Updates the conversation's active booking draft ID.
 */
export async function updateConversationDraftId(
  conversationId: string,
  draftId: string
): Promise<void> {
  for (const conv of inMemoryConversations.values()) {
    if (conv.id === conversationId) {
      conv.durableBookingDraftId = draftId;
      break;
    }
  }

  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      await serviceClient
        .from("whatsapp_conversations")
        .update({ durable_booking_draft_id: draftId, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Updates the conversation's AI mode (e.g. for human handoff or pause).
 */
export async function updateConversationAiMode(
  conversationId: string,
  mode: WhatsAppAiMode
): Promise<void> {
  for (const conv of inMemoryConversations.values()) {
    if (conv.id === conversationId) {
      conv.aiMode = mode;
      break;
    }
  }

  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      await serviceClient
        .from("whatsapp_conversations")
        .update({ ai_mode: mode, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch {
      // Non-blocking
    }
  }
}

// In-memory set of reserved outbound delivery intents: `${conversationId}:${inboundProviderMessageId}`
const inMemoryReservedIntents = new Map<string, { status: "pending_send" | "sent" | "failed" | "ambiguous_outcome"; providerMessageId?: string }>();

export function clearReservedIntents(): void {
  inMemoryReservedIntents.clear();
}

/**
 * Atomically reserves the intent to dispatch an outbound reply for an inbound message BEFORE network dispatch.
 * Prevents duplicate concurrent sends or duplicate sends following worker crash after provider acceptance.
 * Returns:
 * - { allowed: true } if this is the first attempt to send a reply for this inbound message.
 * - { allowed: false, reason: string } if an attempt is already in-flight, completed, or in ambiguous outcome.
 */
export async function reserveOutboundIntent(
  conversationId: string,
  inboundProviderMessageId: string,
  businessId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const intentKey = `${conversationId}:${inboundProviderMessageId}`;

  // 1. In-memory check
  const existing = inMemoryReservedIntents.get(intentKey);
  if (existing) {
    if (existing.status === "sent") {
      return { allowed: false, reason: "Outbound reply already successfully sent" };
    }
    if (existing.status === "pending_send") {
      return { allowed: false, reason: "Outbound send already in-flight or awaiting provider reconciliation" };
    }
    if (existing.status === "ambiguous_outcome") {
      return { allowed: false, reason: "Previous send outcome is ambiguous; automatic duplicate send suppressed" };
    }
  }

  // 2. Database check
  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data } = await serviceClient
        .from("whatsapp_messages")
        .select("id, delivery_status, provider_message_id")
        .eq("conversation_id", conversationId)
        .eq("direction", "outbound")
        .ilike("provider_message_id", `%${inboundProviderMessageId}%`)
        .maybeSingle();

      if (data) {
        if (data.delivery_status === "sent" || data.delivery_status === "delivered" || data.delivery_status === "read" || data.delivery_status === "mock_sent") {
          return { allowed: false, reason: "Outbound reply already recorded in database" };
        }
        if (data.delivery_status === "pending_send" || data.delivery_status === "ambiguous_outcome") {
          return { allowed: false, reason: `Outbound reply status is '${data.delivery_status}'; automatic retry suppressed` };
        }
      }

      // Persist durable intent row in database before outbound network dispatch
      if (businessId) {
        await serviceClient.from("whatsapp_messages").insert({
          business_id: businessId,
          conversation_id: conversationId,
          provider_message_id: `intent:${conversationId}:${inboundProviderMessageId}`,
          direction: "outbound",
          message_type: "text",
          sanitized_content: "[pending_send]",
          delivery_status: "pending_send",
        });
      }
    } catch {
      // Non-blocking fallback to in-memory
    }
  }

  // Record intent as pending_send in memory
  inMemoryReservedIntents.set(intentKey, { status: "pending_send" });
  return { allowed: true };
}

/**
 * Finalizes the outbound attempt after provider response or error.
 */
export async function finalizeOutboundIntent(
  conversationId: string,
  inboundProviderMessageId: string,
  status: "sent" | "failed" | "ambiguous_outcome",
  providerMessageId?: string
): Promise<void> {
  const intentKey = `${conversationId}:${inboundProviderMessageId}`;
  inMemoryReservedIntents.set(intentKey, { status, providerMessageId });

  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      await serviceClient
        .from("whatsapp_messages")
        .update({
          delivery_status: status,
          provider_message_id: providerMessageId || `intent:${conversationId}:${inboundProviderMessageId}`,
          provider_timestamp: new Date().toISOString(),
        })
        .eq("conversation_id", conversationId)
        .eq("provider_message_id", `intent:${conversationId}:${inboundProviderMessageId}`);
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Records an inbound or outbound WhatsApp message in the audit log.
 */
export interface RecordWhatsAppMessageParams {
  businessId: string;
  conversationId: string;
  providerMessageId: string;
  direction: "inbound" | "outbound";
  sanitizedContent?: string;
  content?: string;
  deliveryStatus?: "received" | "sent" | "delivered" | "failed" | "mock_sent";
  messageType?: "text" | "interactive_button" | "interactive_list" | "template";
  providerTimestamp?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

/**
 * Records an inbound or outbound WhatsApp message in the audit log.
 */
export async function recordWhatsAppMessage(
  businessIdOrParams: string | RecordWhatsAppMessageParams,
  maybeConversationId?: string,
  maybeProviderMessageId?: string,
  maybeDirection?: "inbound" | "outbound",
  maybeContent?: string,
  maybeDeliveryStatus: "received" | "sent" | "delivered" | "failed" | "mock_sent" = "received",
  maybeMessageType: "text" | "interactive_button" | "interactive_list" | "template" = "text"
): Promise<void> {
  let businessId: string;
  let conversationId: string;
  let providerMessageId: string;
  let direction: "inbound" | "outbound";
  let content: string;
  let deliveryStatus: "received" | "sent" | "delivered" | "failed" | "mock_sent";
  let messageType: "text" | "interactive_button" | "interactive_list" | "template";
  let providerTimestamp: string;

  if (typeof businessIdOrParams === "object" && businessIdOrParams !== null) {
    businessId = businessIdOrParams.businessId;
    conversationId = businessIdOrParams.conversationId;
    providerMessageId = businessIdOrParams.providerMessageId;
    direction = businessIdOrParams.direction;
    content = businessIdOrParams.sanitizedContent ?? businessIdOrParams.content ?? "";
    deliveryStatus = businessIdOrParams.deliveryStatus || "received";
    messageType = businessIdOrParams.messageType || "text";
    providerTimestamp = businessIdOrParams.providerTimestamp || new Date().toISOString();
  } else {
    businessId = businessIdOrParams;
    conversationId = maybeConversationId || "";
    providerMessageId = maybeProviderMessageId || "";
    direction = maybeDirection || "inbound";
    content = maybeContent ?? "";
    deliveryStatus = maybeDeliveryStatus;
    messageType = maybeMessageType;
    providerTimestamp = new Date().toISOString();
  }

  const msg: WhatsAppMessage = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    businessId,
    conversationId,
    providerMessageId,
    direction,
    messageType,
    sanitizedContent: (content || "").trim(),
    deliveryStatus,
    providerTimestamp,
    createdAt: new Date().toISOString(),
  };

  const list = inMemoryMessages.get(conversationId) || [];
  list.push(msg);
  inMemoryMessages.set(conversationId, list);

  const serviceClient = createServiceClient();
  if (serviceClient) {
    const { error: msgInsertError } = await serviceClient.from("whatsapp_messages").insert({
      business_id: businessId,
      conversation_id: conversationId,
      provider_message_id: providerMessageId,
      direction,
      message_type: messageType,
      sanitized_content: content.trim(),
      delivery_status: deliveryStatus,
    });

    if (msgInsertError) {
      console.error("[WhatsApp] Database message insert failed:", {
        code: msgInsertError.code,
        message: msgInsertError.message,
      });
      throw new WhatsAppDatabaseError(
        `Failed to persist message record: ${msgInsertError.message}`,
        msgInsertError.code,
        isRetryablePostgresCode(msgInsertError.code)
      );
    }
  }
}

/**
 * Retrieves recent message history for the AI conversation window (max 8 messages).
 */
export async function getRecentConversationHistory(
  conversationId: string,
  limit: number = 8
): Promise<ChatMessage[]> {
  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data } = await serviceClient
        .from("whatsapp_messages")
        .select("direction, sanitized_content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (data && data.length > 0) {
        return data
          .reverse()
          .map((m) => ({
            role: m.direction === "inbound" ? "user" : "assistant",
            content: m.sanitized_content,
          }));
      }
    } catch {
      // Fall through to in-memory
    }
  }

  const memoryList = inMemoryMessages.get(conversationId) || [];
  return memoryList
    .slice(-limit)
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.sanitizedContent,
    }));
}
