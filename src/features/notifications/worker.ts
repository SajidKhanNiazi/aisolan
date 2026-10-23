/**
 * BookPilot AI — Transactional Notification Queue Worker
 * Phase 1G-A: Atomic Batch Processing, Exponential Backoff & Lease Recovery
 */

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getDeliveryProvider } from "./provider";
import { renderEmailTemplate } from "./templates";
import type {
  EmailDeliveryProvider,
  NotificationOutboxItem,
  ProcessBatchOutcome,
} from "./types";
import { getEnv } from "@/lib/env";

export interface WorkerOptions {
  batchSize?: number;
  leaseSeconds?: number;
  provider?: EmailDeliveryProvider;
  appUrl?: string;
}

/**
 * Calculates exponential backoff delay in seconds.
 * Formula: min(3600, 2^(attempt - 1) * 30) => 30s, 60s, 120s, 240s, 480s ...
 */
export function calculateBackoffSeconds(attemptCount: number): number {
  const safeAttempt = Math.max(1, attemptCount);
  const factor = Math.pow(2, safeAttempt - 1);
  return Math.min(3600, factor * 30);
}

/**
 * Validates whether an email address is syntactically plausible.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Processes a single batch of due notifications from the PostgreSQL outbox.
 * Thread-safe and concurrency-guarded via atomic PostgreSQL FOR UPDATE SKIP LOCKED.
 */
export async function processNotificationOutboxBatch(
  options: WorkerOptions = {}
): Promise<ProcessBatchOutcome> {
  const batchSize = Math.max(1, Math.min(options.batchSize || 10, 50));
  const leaseSeconds = options.leaseSeconds || 300;
  const env = getEnv();
  const appUrl = options.appUrl || env.appUrl || "https://aisolan.vercel.app";
  const provider = options.provider || getDeliveryProvider();

  const outcome: ProcessBatchOutcome = {
    processed: 0,
    succeeded: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const serviceClient = createServiceClient();
  const supabase = serviceClient || (await createClient());

  if (!supabase) {
    console.error("[NotificationWorker] Database client unavailable.");
    outcome.errors.push({ id: "client_init", error: "Database client unavailable" });
    return outcome;
  }

  // 1. Atomically claim batch of due jobs
  const { data: claimedJobs, error: claimError } = await supabase.rpc(
    "claim_due_notifications_atomic",
    {
      p_batch_size: batchSize,
      p_lease_seconds: leaseSeconds,
    }
  );

  if (claimError) {
    console.error("[NotificationWorker] Atomic claim error:", claimError);
    outcome.errors.push({ id: "claim_rpc", error: claimError.message });
    return outcome;
  }

  if (!claimedJobs || !Array.isArray(claimedJobs) || claimedJobs.length === 0) {
    return outcome;
  }

  // Cast returned rows
  const jobs = claimedJobs as NotificationOutboxItem[];
  outcome.processed = jobs.length;

  // 2. Process each claimed notification sequentially or in safe parallel chunks
  for (const job of jobs) {
    try {
      // Guard A: Validate recipient email
      if (!isValidEmailFormat(job.recipient_email)) {
        await supabase
          .from("notification_outbox")
          .update({
            status: "failed",
            last_error_code: "INVALID_EMAIL",
            last_error_message: "Recipient email format is invalid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.failed++;
        outcome.errors.push({
          id: job.id,
          error: "Recipient email format is invalid",
          code: "INVALID_EMAIL",
        });
        continue;
      }

      // Guard B: Check if job was superseded / marked skipped
      if (job.status === "skipped") {
        outcome.skipped++;
        continue;
      }

      // Guard C: Render Template
      const rendered = renderEmailTemplate(job.template_key, job.payload, appUrl);

      // Guard D: Send via Provider
      const sendResult = await provider.sendEmail({
        to: job.recipient_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: job.dedupe_key,
      });

      if (sendResult.success) {
        // Success: Mark sent
        await supabase
          .from("notification_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: sendResult.messageId || null,
            last_error_code: null,
            last_error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.succeeded++;
      } else {
        // Failure handling: Temporary vs Permanent
        const isRetryable = sendResult.isRetryable !== false;
        const currentAttempts = job.attempt_count;
        const maxAttempts = job.max_attempts || 5;

        if (isRetryable && currentAttempts < maxAttempts) {
          const backoffSecs = calculateBackoffSeconds(currentAttempts);
          const nextAttemptDate = new Date(Date.now() + backoffSecs * 1000).toISOString();

          await supabase
            .from("notification_outbox")
            .update({
              status: "retry_pending",
              next_attempt_at: nextAttemptDate,
              last_error_code: sendResult.errorCode || "TEMPORARY_DELIVERY_FAILURE",
              last_error_message: sendResult.errorMessage || "Delivery retry scheduled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.retried++;
        } else {
          // Exceeded max attempts or permanent failure
          await supabase
            .from("notification_outbox")
            .update({
              status: "failed",
              last_error_code: sendResult.errorCode || "MAX_ATTEMPTS_EXCEEDED",
              last_error_message: sendResult.errorMessage || "Exceeded maximum retry attempts",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.failed++;
        }

        outcome.errors.push({
          id: job.id,
          error: sendResult.errorMessage || "Delivery failed",
          code: sendResult.errorCode,
        });
      }
    } catch (jobErr: unknown) {
      const err = jobErr as Error;
      console.error(`[NotificationWorker] Unexpected error processing job ${job.id}:`, err.message);

      await supabase
        .from("notification_outbox")
        .update({
          status: "retry_pending",
          next_attempt_at: new Date(Date.now() + 60 * 1000).toISOString(),
          last_error_code: "WORKER_INTERNAL_ERROR",
          last_error_message: err.message || "Internal exception during processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      outcome.retried++;
      outcome.errors.push({
        id: job.id,
        error: err.message,
        code: "WORKER_INTERNAL_ERROR",
      });
    }
  }

  return outcome;
}
