/**
 * BookPilot AI — Google Calendar Background Sync Worker Endpoint
 * Phase 1G-B: Authenticated endpoint for Hostinger Cron, Vercel Cron, or manual sync sweepers
 */

import { NextRequest, NextResponse } from "next/server";
import { processCalendarSyncBatch } from "@/features/integrations/google-calendar/worker";
import { calendarSyncWorkerQuerySchema } from "@/features/integrations/google-calendar/validation";

/**
 * Validates request authorization using the configured CRON_SECRET.
 * Supports:
 *   1. Bearer <CRON_SECRET> in Authorization header
 *   2. x-cron-secret header
 */
function isAuthorized(request: NextRequest): boolean {
  const serverCronSecret = process.env.CRON_SECRET;

  if (!serverCronSecret || serverCronSecret.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      console.error("[CalendarSyncAPI] CRON_SECRET is not configured in production environment.");
      return false;
    }
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

  // Check URL query parameter fallback (for simple cron trigger tools like Hostinger web cron)
  const querySecret = request.nextUrl.searchParams.get("secret") || request.nextUrl.searchParams.get("cron_secret");
  if (querySecret && querySecret === cleanSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
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
  const parsed = calendarSyncWorkerQuerySchema.safeParse({
    batchSize: searchParams.get("batchSize") || undefined,
    leaseSeconds: searchParams.get("leaseSeconds") || undefined,
  });

  const { batchSize, leaseSeconds } = parsed.success
    ? parsed.data
    : { batchSize: 10, leaseSeconds: 300 };

  try {
    const outcome = await processCalendarSyncBatch({
      batchSize,
      leaseSeconds,
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
    console.error("[CalendarSyncAPI] Unexpected worker error:", err.message);
    return NextResponse.json(
      {
        success: false,
        error: "Internal error processing calendar sync queue.",
        code: "WORKER_ERROR",
      },
      { status: 500 }
    );
  }
}
