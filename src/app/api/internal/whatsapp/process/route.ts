import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsAppWorkerTrigger } from "@/features/integrations/whatsapp/trigger";
import { processWhatsAppEventQueueBatch } from "@/features/integrations/whatsapp/worker";

/**
 * POST /api/internal/whatsapp/process
 * Internal real-time worker endpoint triggered by Upstash QStash or CRON_SECRET.
 * Authenticated via official QStash signature verification (Upstash-Signature)
 * or internal CRON_SECRET bearer token.
 * 
 * Atomically claims due events from PostgreSQL using FOR UPDATE SKIP LOCKED,
 * processes the AI receptionist workflow, enforces outbound safety guards,
 * and records state.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 1. Verify trigger authentication
  const verification = await verifyWhatsAppWorkerTrigger(
    req.headers,
    rawBody,
    req.url
  );

  if (!verification.valid) {
    return NextResponse.json(
      {
        success: false,
        error: verification.error || "Unauthorized",
      },
      { status: 401 }
    );
  }

  // 2. Parse optional request parameters
  let batchSize = 10;
  let leaseSeconds = 60;

  try {
    if (rawBody.trim().length > 0) {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed.batchSize === "number") {
        batchSize = Math.max(1, Math.min(parsed.batchSize, 50));
      }
      if (typeof parsed.leaseSeconds === "number") {
        leaseSeconds = Math.max(10, Math.min(parsed.leaseSeconds, 300));
      }
    }
  } catch {
    // Non-blocking parse error: proceed with defaults
  }

  // 3. Atomically claim and process due queue events
  try {
    const outcome = await processWhatsAppEventQueueBatch({
      batchSize,
      leaseSeconds,
    });

    return NextResponse.json(
      {
        success: true,
        caller: verification.caller,
        outcome,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal worker error";
    console.error("[WhatsAppWorkerEndpoint] Processing error:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
