/**
 * Bookzello — Phase 1H-D1 WhatsApp Durable Inbound Worker
 * Atomically claims, processes, retries, and dead-letters pending inbound WhatsApp webhook events.
 * Uses atomic PostgreSQL FOR UPDATE SKIP LOCKED via RPC `claim_due_whatsapp_events_atomic`.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { processInboundWhatsAppMessage } from "./adapter";
import { updateWebhookEventStatus } from "./durable-events";
import type { InboundMessageContext } from "./types";

export interface WhatsAppWorkerOptions {
  batchSize?: number;
  leaseSeconds?: number;
  forceMockOutbound?: boolean;
}

export interface WhatsAppWorkerBatchOutcome {
  claimed: number;
  succeeded: number;
  retried: number;
  deadLettered: number;
  ignored: number;
  errors: Array<{ eventKey: string; error: string }>;
}

/**
 * Calculates exponential backoff delay in seconds.
 * Formula: min(3600, 2^(attempt - 1) * 30) => 30s, 60s, 120s, 240s...
 */
export function calculateWhatsAppBackoffSeconds(attemptCount: number): number {
  const safeAttempt = Math.max(1, attemptCount);
  const factor = Math.pow(2, safeAttempt - 1);
  return Math.min(3600, factor * 30);
}

export interface ClaimedWhatsAppEvent {
  id: string;
  provider_event_key: string;
  event_type: "message" | "status" | "error" | "unknown";
  phone_number_id: string;
  business_id: string | null;
  payload: Record<string, unknown>;
  processing_status: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  created_at: string;
}

// In-memory queue storage for offline test simulation
const inMemoryQueueEvents = new Map<string, ClaimedWhatsAppEvent>();

export function enqueueMockWhatsAppEvent(event: ClaimedWhatsAppEvent): void {
  inMemoryQueueEvents.set(event.provider_event_key, { ...event });
}

export function clearMockWhatsAppEventQueue(): void {
  inMemoryQueueEvents.clear();
}

/**
 * Atomically claims due events from database or mock memory store.
 */
export async function claimDueWhatsAppEvents(
  batchSize: number,
  leaseSeconds: number
): Promise<ClaimedWhatsAppEvent[]> {
  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data, error } = await serviceClient.rpc("claim_due_whatsapp_events_atomic", {
        p_batch_size: batchSize,
        p_lease_seconds: leaseSeconds,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as ClaimedWhatsAppEvent[];
      }
    } catch {
      // Fall through to in-memory check
    }
  }

  // In-memory claim simulation for unit/integration tests
  const now = new Date();
  const claimed: ClaimedWhatsAppEvent[] = [];

  for (const [key, item] of inMemoryQueueEvents.entries()) {
    if (claimed.length >= batchSize) break;

    const isDue =
      (item.processing_status === "queued" || item.processing_status === "retry_pending") &&
      new Date(item.next_attempt_at) <= now;

    // Lease expiration check (recovery from crash)
    const isLeaseExpired =
      item.processing_status === "processing" &&
      new Date(item.next_attempt_at).getTime() + leaseSeconds * 1000 < now.getTime();

    if (isDue || isLeaseExpired) {
      item.processing_status = "processing";
      item.attempt_count += 1;
      claimed.push({ ...item });
      inMemoryQueueEvents.set(key, item);
    }
  }

  return claimed;
}

/**
 * Processes a single claimed webhook event.
 */
export async function processClaimedWhatsAppEvent(
  event: ClaimedWhatsAppEvent,
  forceMockOutbound = false
): Promise<{ success: boolean; action?: string; error?: string }> {
  if (event.event_type !== "message") {
    await updateWebhookEventStatus(event.provider_event_key, "ignored");
    return { success: true, action: "ignored" };
  }

  const payload = event.payload as {
    wabaId?: string;
    metadata?: { phone_number_id?: string; display_phone_number?: string };
    message?: {
      id: string;
      from: string;
      timestamp: string;
      type: string;
      text?: { body: string };
      interactive?: {
        type: string;
        button_reply?: { id: string; title: string };
        list_reply?: { id: string; title: string };
      };
      button?: { text: string; payload: string };
    };
    contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
  };

  const msg = payload.message;
  if (!msg) {
    throw new Error("Invalid event payload: missing message body");
  }

  // Extract message text / interactive payload
  let messageText = "";
  let isInteractive = false;
  let interactivePayloadId: string | undefined;

  if (msg.type === "text" && msg.text?.body) {
    messageText = msg.text.body;
  } else if (msg.type === "interactive" && msg.interactive) {
    isInteractive = true;
    if (msg.interactive.type === "button_reply" && msg.interactive.button_reply) {
      messageText = msg.interactive.button_reply.title;
      interactivePayloadId = msg.interactive.button_reply.id;
    } else if (msg.interactive.type === "list_reply" && msg.interactive.list_reply) {
      messageText = msg.interactive.list_reply.title;
      interactivePayloadId = msg.interactive.list_reply.id;
    }
  } else if (msg.type === "button" && msg.button) {
    messageText = msg.button.text;
    interactivePayloadId = msg.button.payload;
  } else {
    messageText = "[Unsupported media or message type]";
  }

  const contact = payload.contacts?.find((c) => c.wa_id === msg.from);
  const customerName = contact?.profile?.name;

  const context: InboundMessageContext = {
    providerMessageId: msg.id,
    fromWaId: msg.from,
    customerName,
    phoneNumberId: event.phone_number_id,
    wabaId: payload.wabaId || "",
    timestamp: msg.timestamp,
    text: messageText,
    rawType: msg.type,
    isInteractiveReply: isInteractive,
    interactivePayloadId,
  };

  // Dispatch to shared AI adapter
  const adapterResult = await processInboundWhatsAppMessage(context, forceMockOutbound);

  if (adapterResult.handled) {
    await updateWebhookEventStatus(event.provider_event_key, "completed");
    return { success: true, action: adapterResult.action };
  }

  // If permanently disabled or ignored, mark as ignored
  if (adapterResult.action === "disabled" || adapterResult.action === "ignored") {
    await updateWebhookEventStatus(
      event.provider_event_key,
      "ignored",
      undefined,
      adapterResult.error
    );
    return { success: true, action: adapterResult.action };
  }

  throw new Error(adapterResult.error || "Adapter failed to process message");
}

/**
 * Main worker batch processing function.
 * Called by internal scheduled cron or webhook background task.
 */
export async function processWhatsAppEventQueueBatch(
  options: WhatsAppWorkerOptions = {}
): Promise<WhatsAppWorkerBatchOutcome> {
  const batchSize = Math.max(1, Math.min(options.batchSize || 10, 50));
  const leaseSeconds = options.leaseSeconds || 60;
  const forceMock = options.forceMockOutbound ?? false;

  const outcome: WhatsAppWorkerBatchOutcome = {
    claimed: 0,
    succeeded: 0,
    retried: 0,
    deadLettered: 0,
    ignored: 0,
    errors: [],
  };

  const claimedEvents = await claimDueWhatsAppEvents(batchSize, leaseSeconds);
  outcome.claimed = claimedEvents.length;

  if (claimedEvents.length === 0) {
    return outcome;
  }

  const serviceClient = createServiceClient();

  for (const event of claimedEvents) {
    try {
      const res = await processClaimedWhatsAppEvent(event, forceMock);
      if (res.action === "ignored") {
        outcome.ignored += 1;
      } else {
        outcome.succeeded += 1;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown processing error";
      outcome.errors.push({ eventKey: event.provider_event_key, error: errorMsg });

      const isFinalAttempt = event.attempt_count >= event.max_attempts;

      if (isFinalAttempt) {
        // Dead-letter the event
        outcome.deadLettered += 1;
        await updateWebhookEventStatus(
          event.provider_event_key,
          "failed",
          "EXCEEDED_MAX_ATTEMPTS",
          errorMsg
        );
      } else {
        // Schedule retry with exponential backoff
        outcome.retried += 1;
        const backoffSeconds = calculateWhatsAppBackoffSeconds(event.attempt_count);
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

        if (serviceClient) {
          try {
            await serviceClient
              .from("whatsapp_webhook_events")
              .update({
                processing_status: "retry_pending",
                next_attempt_at: nextAttemptAt,
                last_error_code: "PROCESSING_RETRY",
                last_error_message: errorMsg,
              })
              .eq("provider_event_key", event.provider_event_key);
          } catch {
            // Non-blocking
          }
        }
      }
    }
  }

  return outcome;
}
