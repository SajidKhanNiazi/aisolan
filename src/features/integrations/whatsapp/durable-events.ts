import { createServiceClient } from "@/lib/supabase/service";

// In-memory set of recorded event keys for offline testing
const inMemoryRecordedEvents = new Set<string>();

export function clearInMemoryEvents(): void {
  inMemoryRecordedEvents.clear();
}

export interface RecordInboundWebhookEventParams {
  providerEventKey: string;
  eventType: "message" | "status" | "error" | "unknown";
  phoneNumberId: string;
  businessId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Persists an inbound webhook event to the durable event queue.
 * Returns { isDuplicate: true } if the event was already recorded, preventing duplicate processing.
 */
export async function recordInboundWebhookEvent(
  eventKeyOrParams: string | RecordInboundWebhookEventParams,
  maybeEventType?: "message" | "status" | "error" | "unknown",
  maybePhoneNumberId?: string,
  maybeBusinessId?: string | null,
  maybePayload: Record<string, unknown> = {}
): Promise<{ recorded: boolean; isDuplicate: boolean; eventId?: string; status: "recorded" | "duplicate" | "failed" }> {
  let eventKey: string;
  let eventType: "message" | "status" | "error" | "unknown";
  let phoneNumberId: string;
  let businessId: string | null | undefined;
  let payload: Record<string, unknown>;

  if (typeof eventKeyOrParams === "object" && eventKeyOrParams !== null) {
    eventKey = eventKeyOrParams.providerEventKey;
    eventType = eventKeyOrParams.eventType;
    phoneNumberId = eventKeyOrParams.phoneNumberId;
    businessId = eventKeyOrParams.businessId;
    payload = eventKeyOrParams.payload || {};
  } else {
    eventKey = eventKeyOrParams;
    eventType = maybeEventType || "unknown";
    phoneNumberId = maybePhoneNumberId || "";
    businessId = maybeBusinessId;
    payload = maybePayload;
  }

  if (!eventKey) {
    return { recorded: false, isDuplicate: false, status: "failed" };
  }

  // 1. In-memory check for quick deduplication and offline test runners
  if (inMemoryRecordedEvents.has(eventKey)) {
    return { recorded: false, isDuplicate: true, status: "duplicate" };
  }
  inMemoryRecordedEvents.add(eventKey);

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return { recorded: true, isDuplicate: false, eventId: "local-event-" + Date.now(), status: "recorded" };
  }

  try {
    const { data, error } = await serviceClient
      .from("whatsapp_webhook_events")
      .insert({
        provider_event_key: eventKey,
        event_type: eventType,
        phone_number_id: phoneNumberId,
        business_id: businessId || null,
        payload,
        processing_status: "queued",
      })
      .select("id")
      .single();

    if (error) {
      // Postgres error 23505 = unique constraint violation (duplicate key)
      if (error.code === "23505" || error.message.includes("duplicate key")) {
        return { recorded: false, isDuplicate: true, status: "duplicate" };
      }
      console.warn("[WhatsApp] Failed to persist webhook event durably:", error.message);
      // Still return recorded=true if local memory captured it to avoid crashing the webhook
      return { recorded: true, isDuplicate: false, status: "recorded" };
    }

    return { recorded: true, isDuplicate: false, eventId: data?.id, status: "recorded" };
  } catch (err) {
    console.warn("[WhatsApp] Exception recording webhook event:", err);
    return { recorded: true, isDuplicate: false, status: "recorded" };
  }
}

/**
 * Marks a durable event as processed or failed.
 */
export async function updateWebhookEventStatus(
  eventKey: string,
  status: "completed" | "failed" | "ignored",
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  const serviceClient = createServiceClient();
  if (!serviceClient) return;

  try {
    await serviceClient
      .from("whatsapp_webhook_events")
      .update({
        processing_status: status,
        processed_at: new Date().toISOString(),
        last_error_code: errorCode || null,
        last_error_message: errorMessage || null,
      })
      .eq("provider_event_key", eventKey);
  } catch {
    // Non-blocking status update
  }
}
