import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutboxBatch } from "@/features/notifications/worker";
import { notificationWorkerQuerySchema } from "@/features/notifications/validation";
import { cleanupExpiredConversationalDrafts } from "@/features/ai-receptionist/booking";


/**
 * Validates request authorization using the configured CRON_SECRET.
 * Supports:
 *   1. Bearer <CRON_SECRET> in Authorization header
 *   2. x-cron-secret header
 *   3. Standard Vercel Cron authorization header
 */
function isAuthorized(request: NextRequest): boolean {
  const serverCronSecret = process.env.CRON_SECRET;

  // In production, CRON_SECRET is strictly mandatory
  if (!serverCronSecret || serverCronSecret.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      console.error("[NotificationProcessAPI] CRON_SECRET is not configured in production environment.");
      return false;
    }
    // In local development or test without secret, allow loopback requests
    return true;
  }

  const cleanSecret = serverCronSecret.trim();

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1] === cleanSecret) {
      return true;
    }
  }

  // Check x-cron-secret header
  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret && xCronSecret === cleanSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  return handleProcess(request);
}

export async function POST(request: NextRequest) {
  return handleProcess(request);
}

async function handleProcess(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing cron credentials.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = notificationWorkerQuerySchema.safeParse({
    batchSize: searchParams.get("batchSize") || undefined,
    leaseSeconds: searchParams.get("leaseSeconds") || undefined,
  });

  const { batchSize, leaseSeconds } = parsed.success
    ? parsed.data
    : { batchSize: 10, leaseSeconds: 300 };

  try {
    const outcome = await processNotificationOutboxBatch({
      batchSize,
      leaseSeconds,
    });

    // Non-blocking maintenance: purge expired conversational drafts older than retention window
    cleanupExpiredConversationalDrafts().catch((draftErr) => {
      console.warn("[NotificationProcessAPI] Draft cleanup notice:", draftErr?.message);
    });

    return NextResponse.json({
      success: true,
      processed: outcome.processed,
      succeeded: outcome.succeeded,
      retried: outcome.retried,
      failed: outcome.failed,
      skipped: outcome.skipped,
      errorCount: outcome.errors.length,
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
