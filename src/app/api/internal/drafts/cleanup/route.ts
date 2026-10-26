import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredConversationalDrafts } from "@/features/ai-receptionist/booking";

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
      console.error("[DraftCleanupAPI] CRON_SECRET is not configured in production environment.");
      return false;
    }
    return true;
  }

  const cleanSecret = serverCronSecret.trim();

  // Check Authorization header: Bearer <CRON_SECRET>
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
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

async function handleCleanup(request: NextRequest) {
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

  try {
    const result = await cleanupExpiredConversationalDrafts();
    return NextResponse.json({
      success: result.success,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString(),
      ...(result.error ? { error: result.error } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal cleanup failure";
    console.error("[DraftCleanupAPI] Execution error:", message);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute draft cleanup.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
