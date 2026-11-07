import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutboxBatch } from "@/features/notifications/worker";
import { processAppointmentRemindersBatch } from "@/features/notifications/reminder-worker";
import { notificationWorkerQuerySchema } from "@/features/notifications/validation";
import { cleanupExpiredConversationalDrafts } from "@/features/ai-receptionist/booking";
import { processWhatsAppEventQueueBatch } from "@/features/integrations/whatsapp/worker";
import { getQStashReceiver, promotePendingRemindersToQStash } from "@/lib/qstash";

/**
 * Validates request authorization using:
 *   1. Bearer <CRON_SECRET> in Authorization header
 *   2. x-cron-secret header
 *   3. Cryptographic Upstash QStash signature verification (upstash-signature header)
 */
async function isAuthorized(request: NextRequest, rawBody?: string): Promise<boolean> {
  const serverCronSecret = process.env.CRON_SECRET;

  // 1. Check Bearer CRON_SECRET or x-cron-secret
  if (serverCronSecret && serverCronSecret.trim() !== "") {
    const cleanSecret = serverCronSecret.trim();

    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1] === cleanSecret) {
        return true;
      }
    }

    const xCronSecret = request.headers.get("x-cron-secret");
    if (xCronSecret && xCronSecret === cleanSecret) {
      return true;
    }
  }

  // 2. Check QStash signature if signed by Upstash
  const qstashSignature = request.headers.get("upstash-signature");
  if (qstashSignature) {
    const receiver = getQStashReceiver();
    if (receiver) {
      try {
        const bodyToVerify = rawBody || "";
        const isValid = await receiver.verify({
          signature: qstashSignature,
          body: bodyToVerify,
          url: request.url,
        });
        if (isValid) {
          return true;
        }
      } catch (qErr) {
        console.warn("[NotificationProcessAPI] QStash signature verification failed:", qErr);
      }
    }
  }

  // In production, unauthenticated requests are strictly rejected
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // In local development or test without secret, allow loopback requests
  return !serverCronSecret || serverCronSecret.trim() === "";
}

export async function GET(request: NextRequest) {
  return handleProcess(request);
}

export async function POST(request: NextRequest) {
  let rawBody: string | undefined;
  try {
    rawBody = await request.text();
  } catch {
    // Body read fallback
  }
  return handleProcess(request, rawBody);
}

async function handleProcess(request: NextRequest, rawBody?: string) {
  const authorized = await isAuthorized(request, rawBody);
  if (!authorized) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing cron credentials.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  let bodyJson: Record<string, unknown> | null = null;
  if (rawBody && rawBody.trim().startsWith("{")) {
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      // ignore non-json body
    }
  }

  const { searchParams } = new URL(request.url);
  const parsed = notificationWorkerQuerySchema.safeParse({
    batchSize: searchParams.get("batchSize") || bodyJson?.batchSize || undefined,
    leaseSeconds: searchParams.get("leaseSeconds") || bodyJson?.leaseSeconds || undefined,
  });

  const { batchSize, leaseSeconds } = parsed.success
    ? parsed.data
    : { batchSize: 10, leaseSeconds: 300 };

  try {
    const outcome = await processNotificationOutboxBatch({
      batchSize,
      leaseSeconds,
    });

    // Process due automated appointment reminders
    const remindersOutcome = await processAppointmentRemindersBatch({
      batchSize,
      leaseSeconds,
    }).catch((remErr) => {
      console.warn("[NotificationProcessAPI] Reminder worker notice:", remErr?.message);
      return null;
    });

    // Process due WhatsApp webhook events (retry queue & background worker)
    const whatsappOutcome = await processWhatsAppEventQueueBatch({
      batchSize: 10,
      leaseSeconds: 60,
    }).catch((waErr) => {
      console.warn("[NotificationProcessAPI] WhatsApp worker batch notice:", waErr?.message);
      return null;
    });

    // Non-blocking maintenance: purge expired conversational drafts older than retention window
    cleanupExpiredConversationalDrafts().catch((draftErr) => {
      console.warn("[NotificationProcessAPI] Draft cleanup notice:", draftErr?.message);
    });

    // Promotion sweep: promote pending reminders entering the 7-day QStash window
    promotePendingRemindersToQStash({ batchSize: 25, lookaheadDays: 7 }).catch((promErr) => {
      console.warn("[NotificationProcessAPI] QStash promotion sweep notice:", promErr?.message);
    });

    return NextResponse.json({
      success: true,
      processed: outcome.processed,
      succeeded: outcome.succeeded,
      retried: outcome.retried,
      failed: outcome.failed,
      skipped: outcome.skipped,
      errorCount: outcome.errors.length,
      reminders: remindersOutcome
        ? {
            processed: remindersOutcome.processed,
            succeeded: remindersOutcome.succeeded,
            retried: remindersOutcome.retried,
            failed: remindersOutcome.failed,
            skipped: remindersOutcome.skipped,
            errorCount: remindersOutcome.errors.length,
          }
        : null,
      whatsapp: whatsappOutcome
        ? {
            claimed: whatsappOutcome.claimed,
            succeeded: whatsappOutcome.succeeded,
            retried: whatsappOutcome.retried,
            deadLettered: whatsappOutcome.deadLettered,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[NotificationProcessAPI] Processing error:", err.message);
    return NextResponse.json(
      {
        success: false,
        error: "Internal error processing notification queue.",
        code: "WORKER_ERROR",
      },
      { status: 500 }
    );
  }
}
