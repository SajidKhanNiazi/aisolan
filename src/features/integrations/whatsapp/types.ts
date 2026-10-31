/**
-- * Bookzello — Phase 1H-D1 Meta WhatsApp Cloud API Types
-- */

export type WhatsAppAiMode = "ai" | "human_handoff" | "paused";

export type WhatsAppConnectionStatus = "active" | "disconnected" | "suspended";

export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppMessageType =
  | "text"
  | "interactive_button"
  | "interactive_list"
  | "template"
  | "unknown"
  | "unsupported";

export type WhatsAppDeliveryStatus =
  | "received"
  | "queued"
  | "pending_send"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "ambiguous_outcome"
  | "mock_sent";

export interface WhatsAppConnection {
  id: string;
  businessId: string;
  provider: "meta_cloud_api";
  wabaId: string;
  phoneNumberId: string;
  businessDisplayNumber: string | null;
  verifiedName: string | null;
  connectionStatus: WhatsAppConnectionStatus;
  credentialReference: string | null;
  aiEnabled: boolean;
  bookingEnabled: boolean;
  connectedAt: string;
  disconnectedAt: string | null;
  lastWebhookReceivedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversation {
  id: string;
  businessId: string;
  connectionId: string;
  customerWaId: string;
  customerName: string | null;
  status: "active" | "closed" | "opted_out";
  aiMode: WhatsAppAiMode;
  assignedHumanId: string | null;
  durableBookingDraftId: string | null;
  lastInboundAt: string;
  serviceWindowExpiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  businessId: string;
  conversationId: string;
  providerMessageId: string;
  direction: WhatsAppMessageDirection;
  messageType: WhatsAppMessageType;
  sanitizedContent: string;
  deliveryStatus: WhatsAppDeliveryStatus;
  providerTimestamp: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface WhatsAppWebhookEvent {
  id: string;
  providerEventKey: string;
  eventType: "message" | "status" | "error" | "unknown";
  phoneNumberId: string;
  businessId?: string | null;
  payload: Record<string, unknown>;
  processingStatus: "queued" | "processing" | "completed" | "retry_pending" | "failed" | "ignored";
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  claimedAt?: string | null;
  leaseExpiresAt?: string | null;
  processedAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  createdAt: string;
}

// Meta Official Cloud API Webhook Payload Structures
export interface MetaWebhookPayload {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string; // WABA ID
    changes: Array<{
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string; // Customer wa_id
          id: string;   // wamid.HBg...
          timestamp: string;
          type: "text" | "interactive" | "button" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contacts" | "unknown";
          text?: {
            body: string;
          };
          interactive?: {
            type: "button_reply" | "list_reply";
            button_reply?: {
              id: string;
              title: string;
            };
            list_reply?: {
              id: string;
              title: string;
              description?: string;
            };
          };
          button?: {
            text: string;
            payload: string;
          };
          errors?: Array<{
            code: number;
            title: string;
            message?: string;
            error_data?: { details: string };
          }>;
        }>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message?: string;
          }>;
        }>;
      };
      field: "messages";
    }>;
  }>;
}

export interface InboundMessageContext {
  providerMessageId: string;
  fromWaId: string;
  customerName?: string;
  phoneNumberId: string;
  wabaId: string;
  timestamp: string;
  text: string;
  rawType: string;
  isInteractiveReply: boolean;
  interactivePayloadId?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  mode: "meta_cloud_api" | "mock" | "disabled";
}
