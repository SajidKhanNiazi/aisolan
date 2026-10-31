import { NextRequest, NextResponse } from "next/server";
import {
  verifyMetaWebhookChallenge,
  verifyMetaSignature,
} from "@/features/integrations/whatsapp/security";
import {
  recordInboundWebhookEvent,
  updateWebhookEventStatus,
} from "@/features/integrations/whatsapp/durable-events";
import { processInboundWhatsAppMessage } from "@/features/integrations/whatsapp/adapter";
import { dispatchAsyncWhatsAppWorkerTrigger } from "@/features/integrations/whatsapp/trigger";
import { getWhatsAppExecutionMode } from "@/features/integrations/whatsapp/config";
import type { MetaWebhookPayload, InboundMessageContext } from "@/features/integrations/whatsapp/types";

/**
 * GET /api/integrations/whatsapp/webhook
 * Meta Cloud API Webhook Verification Endpoint.
 * Validates hub.mode and hub.verify_token, returning hub.challenge directly as text.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verification = verifyMetaWebhookChallenge({
    mode,
    token,
    challenge,
  });

  if (!verification.valid || !verification.challenge) {
    return new NextResponse(verification.error || "Forbidden", { status: 403 });
  }

  // Meta requires returning the challenge directly as text/plain with 200 OK
  return new NextResponse(verification.challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

/**
 * POST /api/integrations/whatsapp/webhook
 * Meta Cloud API Inbound Webhook Event Handler.
 * Validates X-Hub-Signature-256 HMAC-SHA256, records event durably,
 * dispatches an authenticated asynchronous worker invocation, and returns HTTP 200 promptly.
 */
export async function POST(req: NextRequest) {
  // Read raw body for timing-safe HMAC validation
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  const sigResult = verifyMetaSignature(rawBody, signature);
  if (!sigResult.valid) {
    return NextResponse.json(
      { error: sigResult.error || "Invalid webhook signature" },
      { status: 401 }
    );
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    return NextResponse.json({ status: "ignored_unknown_object" }, { status: 200 });
  }

  // Iterate entries and changes
  for (const entry of payload.entry) {
    const wabaId = entry.id;
    for (const change of entry.changes || []) {
      if (change.field !== "messages" || !change.value) continue;

      const { metadata, messages, contacts } = change.value;
      const phoneNumberId = metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      // Handle Inbound Messages
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          const providerEventKey = `wa_msg_${msg.id}`;

          // 1. Persist inbound event durably in PostgreSQL (deduplication check)
          const recordRes = await recordInboundWebhookEvent({
            providerEventKey,
            eventType: "message",
            phoneNumberId,
            payload: {
              wabaId,
              metadata,
              message: msg,
              contacts,
            },
          });

          if (recordRes.status === "duplicate") {
            // Already processed or queued; acknowledge to Meta without duplicate reply
            continue;
          }

          // 2. Asynchronous Worker Trigger vs Inline Execution
          if (getWhatsAppExecutionMode() === "inline") {
            // Optional synchronous execution for local debugging
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

            const contact = contacts?.find((c) => c.wa_id === msg.from);
            const customerName = contact?.profile?.name;

            const context: InboundMessageContext = {
              providerMessageId: msg.id,
              fromWaId: msg.from,
              customerName,
              phoneNumberId,
              wabaId,
              timestamp: msg.timestamp,
              text: messageText,
              rawType: msg.type,
              isInteractiveReply: isInteractive,
              interactivePayloadId,
            };

            try {
              const processRes = await processInboundWhatsAppMessage(context);
              if (processRes.handled) {
                await updateWebhookEventStatus(providerEventKey, "completed");
              } else {
                await updateWebhookEventStatus(
                  providerEventKey,
                  processRes.action === "disabled" || processRes.action === "ignored"
                    ? "ignored"
                    : "failed",
                  undefined,
                  processRes.error
                );
              }
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : "Error processing inbound message";
              await updateWebhookEventStatus(providerEventKey, "failed", "PROCESSING_EXCEPTION", errMsg);
            }
          } else {
            // Default Production Mode: Trigger asynchronous authenticated worker invocation
            // Returns HTTP 200 to Meta promptly (<50ms) without waiting for AI or outbound network
            await dispatchAsyncWhatsAppWorkerTrigger({
              providerEventKey,
              eventId: recordRes.eventId,
              phoneNumberId,
            });
          }
        }
      }
    }
  }

  // Meta requires a prompt 200 OK acknowledgment
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
