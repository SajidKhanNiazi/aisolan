/**
 * Bookzello — Phase 1H-D1 WhatsApp Real-Time Worker Trigger (Upstash QStash)
 * Dispatches an asynchronous authenticated HTTP trigger to invoke the internal WhatsApp worker.
 * Supports Upstash QStash signature verification with HMAC-SHA256, deduplication, and CRON_SECRET fallback.
 */

import { Client, Receiver } from "@upstash/qstash";

export interface AsyncTriggerParams {
  providerEventKey: string;
  eventId?: string;
  phoneNumberId?: string;
}

export interface TriggerDispatchResult {
  dispatched: boolean;
  provider: "qstash" | "mock" | "none";
  messageId?: string;
  reason?: string;
}

export interface TriggerVerificationResult {
  valid: boolean;
  caller?: "qstash" | "cron" | "test_mock";
  error?: string;
}

// In-memory mock store for automated Vitest testing
export const mockDispatchedTriggers: Array<{
  timestamp: string;
  providerEventKey: string;
  eventId?: string;
  destinationUrl: string;
}> = [];

export function clearMockDispatchedTriggers(): void {
  mockDispatchedTriggers.length = 0;
}

/**
 * Returns the base URL of the deployment for webhook and trigger callbacks.
 */
export function getAppBaseUrl(): string {
  const customUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (customUrl && customUrl.trim() !== "") {
    return customUrl.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL.trim() !== "") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }
  return "https://bookzello.com";
}

/**
 * Dispatches an asynchronous worker invocation via Upstash QStash.
 * If QSTASH_TOKEN is configured, publishes a JSON message targeting /api/internal/whatsapp/process.
 * If publish fails or QStash is down, errors are caught non-blockingly so the event is safely preserved
 * in the PostgreSQL durable queue for scheduled recovery.
 */
export async function dispatchAsyncWhatsAppWorkerTrigger(
  params: AsyncTriggerParams
): Promise<TriggerDispatchResult> {
  const qstashToken = process.env.QSTASH_TOKEN?.trim();
  const targetUrl = `${getAppBaseUrl()}/api/internal/whatsapp/process`;

  // 1. QStash Managed Asynchronous Dispatch
  if (qstashToken) {
    try {
      const qstashBaseUrl = process.env.QSTASH_URL?.trim() || undefined;
      const client = new Client({
        token: qstashToken,
        baseUrl: qstashBaseUrl,
      });
      const res = await client.publishJSON({
        url: targetUrl,
        body: {
          providerEventKey: params.providerEventKey,
          eventId: params.eventId,
          phoneNumberId: params.phoneNumberId,
        },
        deduplicationId: params.providerEventKey,
        retries: 3,
      });

      return {
        dispatched: true,
        provider: "qstash",
        messageId: res.messageId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "QStash trigger dispatch failed";
      console.warn(`[WhatsAppTrigger] Failed to publish async trigger to QStash: ${msg}. Event preserved in PostgreSQL queue.`);
      return {
        dispatched: false,
        provider: "qstash",
        reason: msg,
      };
    }
  }

  // 2. Offline / Unit Test Mock Dispatch
  if (process.env.NODE_ENV === "test" || process.env.WHATSAPP_MOCK_TRIGGER === "true") {
    mockDispatchedTriggers.push({
      timestamp: new Date().toISOString(),
      providerEventKey: params.providerEventKey,
      eventId: params.eventId,
      destinationUrl: targetUrl,
    });
    return {
      dispatched: true,
      provider: "mock",
      messageId: `mock_msg_${params.providerEventKey}`,
    };
  }

  // 3. Unconfigured fallback (relying solely on scheduled cron recovery)
  return {
    dispatched: false,
    provider: "none",
    reason: "QSTASH_TOKEN is not configured; event retained in PostgreSQL queue for cron recovery",
  };
}

/**
 * Verifies that an incoming request to the internal worker endpoint is authentic.
 * Supports:
 *   1. Upstash QStash HMAC signature verification via Upstash Receiver
 *   2. Server-to-server CRON_SECRET authorization header
 *   3. Isolated test mock authorization
 */
export async function verifyWhatsAppWorkerTrigger(
  headers: Headers,
  rawBody: string,
  requestUrl?: string
): Promise<TriggerVerificationResult> {
  const upstashSignature = headers.get("upstash-signature");
  const authHeader = headers.get("authorization");
  const xCronSecret = headers.get("x-cron-secret");

  // 1. Upstash QStash Signature Verification
  if (upstashSignature) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();

    if (!currentSigningKey) {
      return {
        valid: false,
        error: "QSTASH_CURRENT_SIGNING_KEY is not configured on server",
      };
    }

    try {
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey: nextSigningKey || currentSigningKey,
      });

      // Attempt strict verification with destination URL first
      try {
        await receiver.verify({
          signature: upstashSignature,
          body: rawBody,
          url: requestUrl,
        });
        return { valid: true, caller: "qstash" };
      } catch (firstErr) {
        // Fallback: If URL differs due to serverless proxy routing, verify signature and body hash
        try {
          await receiver.verify({
            signature: upstashSignature,
            body: rawBody,
          });
          return { valid: true, caller: "qstash" };
        } catch {
          throw firstErr;
        }
      }
    } catch (verifyErr: unknown) {
      const msg = verifyErr instanceof Error ? verifyErr.message : "Invalid QStash signature";
      return { valid: false, error: `QStash signature validation failed: ${msg}` };
    }
  }

  // 2. CRON_SECRET Authorization Verification
  const serverCronSecret = process.env.CRON_SECRET?.trim();
  if (serverCronSecret && serverCronSecret.length > 0) {
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1] === serverCronSecret) {
        return { valid: true, caller: "cron" };
      }
    }
    if (xCronSecret && xCronSecret === serverCronSecret) {
      return { valid: true, caller: "cron" };
    }
  }

  // 3. Test Mock Verification
  if (process.env.NODE_ENV === "test") {
    const mockAuth = headers.get("x-test-worker-auth");
    if (mockAuth === "valid_mock_token") {
      return { valid: true, caller: "test_mock" };
    }
  }

  return {
    valid: false,
    error: "Unauthorized: Missing valid Upstash signature or internal authorization credentials",
  };
}
