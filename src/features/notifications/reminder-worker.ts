/**
 * BookPilot AI — Automated Appointment Reminder Queue Worker
 * Phase P0: Atomic Batch Processing, Idempotent Resend Dispatch & Timezone Precision
 */

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getDeliveryProvider, isEmailDeliveryConfigured } from "./provider";
import { renderEmailTemplate } from "./templates";
import { calculateBackoffSeconds, isValidEmailFormat, type WorkerOptions } from "./worker";
import type {
  ClaimedReminderJob,
  EmailDeliveryProvider,
  NotificationTemplatePayload,
  ProcessBatchOutcome,
} from "./types";
import { getEnv } from "@/lib/env";

export type ReminderWorkerOptions = WorkerOptions;

/**
 * Processes a single batch of due appointment reminders from the PostgreSQL queue.
 * Thread-safe and concurrency-guarded via atomic PostgreSQL FOR UPDATE SKIP LOCKED.
 */
export async function processAppointmentRemindersBatch(
  options: ReminderWorkerOptions = {}
): Promise<ProcessBatchOutcome> {
  const batchSize = Math.max(1, Math.min(options.batchSize || 10, 50));
  const leaseSeconds = options.leaseSeconds || 300;
  const env = getEnv();
  const appUrl = options.appUrl || env.appUrl || "https://bookzello.com";
  const provider: EmailDeliveryProvider = options.provider || getDeliveryProvider();

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
    console.error("[ReminderWorker] Database client unavailable.");
    outcome.errors.push({ id: "client_init", error: "Database client unavailable" });
    return outcome;
  }

  // Production safety 1: Global outbound reminder feature flag check (default OFF)
  // Ensures zero live customer reminder emails are dispatched unless explicitly authorized by platform owner
  const isGlobalOutboundEnabled = process.env.ENABLE_OUTBOUND_REMINDERS === "true";
  if (!isGlobalOutboundEnabled && !options.provider) {
    console.info(
      "[ReminderWorker] Global feature flag ENABLE_OUTBOUND_REMINDERS is OFF. Outbound reminder processing safely paused."
    );
    return outcome;
  }

  // Production safety 2: If email delivery is unconfigured in production and no explicit mock provider, pause
  if (process.env.NODE_ENV === "production" && !isEmailDeliveryConfigured() && !options.provider) {
    console.warn(
      "[ReminderWorker] RESEND_API_KEY is not configured in production. Reminder dispatch paused to prevent marking unverified emails as sent."
    );
    return outcome;
  }

  // 1. Atomically claim batch of due reminder jobs
  const { data: claimedJobs, error: claimError } = await supabase.rpc(
    "claim_due_reminders_atomic",
    {
      p_batch_size: batchSize,
      p_lease_seconds: leaseSeconds,
    }
  );

  if (claimError) {
    console.error("[ReminderWorker] Atomic claim error:", claimError);
    outcome.errors.push({ id: "claim_rpc", error: claimError.message });
    return outcome;
  }

  if (!claimedJobs || !Array.isArray(claimedJobs) || claimedJobs.length === 0) {
    return outcome;
  }

  const jobs = claimedJobs as ClaimedReminderJob[];
  outcome.processed = jobs.length;

  const nowMs = Date.now();

  for (const job of jobs) {
    try {
      // 2. Pre-flight Check: Validate appointment status
      if (job.appointment_status !== "confirmed" && job.appointment_status !== "pending") {
        await supabase
          .from("appointment_reminders")
          .update({
            status: "cancelled",
            last_error_message: `Appointment is ${job.appointment_status}; reminder invalidated.`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped += 1;
        continue;
      }

      // 3. Pre-flight Check: Has the appointment already started or ended?
      const apptStartMs = new Date(job.starts_at).getTime();
      if (apptStartMs <= nowMs) {
        await supabase
          .from("appointment_reminders")
          .update({
            status: "skipped",
            last_error_message: "Appointment start time has already arrived or passed.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped += 1;
        continue;
      }

      // 4. Pre-flight Check: Syntactic email validation
      if (!isValidEmailFormat(job.recipient_email)) {
        await supabase
          .from("appointment_reminders")
          .update({
            status: "skipped",
            last_error_code: "INVALID_EMAIL",
            last_error_message: `Recipient email '${job.recipient_email || ""}' is invalid or empty.`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped += 1;
        continue;
      }

      // 5. Construct payload & render localized email template
      const payload: NotificationTemplatePayload = {
        business_name: job.business_name,
        business_slug: job.business_slug,
        business_phone: job.business_phone,
        business_email: job.business_email,
        business_timezone: job.business_timezone || "Europe/London",
        business_address: job.business_address,
        customer_name: job.recipient_name,
        customer_email: job.recipient_email,
        customer_phone: job.customer_phone,
        service_name: job.service_name,
        staff_name: job.staff_name,
        starts_at: job.starts_at,
        service_ends_at: job.service_ends_at,
        duration_minutes: job.duration_minutes,
        price_minor: job.price_minor,
        currency: job.currency || "GBP",
        booking_reference:
          "APPT-" + job.appointment_id.replace(/-/g, "").substring(0, 8).toUpperCase(),
        management_url: `${appUrl}/booking/${job.business_slug}`,
      };

      const rendered = renderEmailTemplate("customer_appointment_reminder", payload, appUrl);

      // 6. Send email via Resend with idempotency key
      const sendResult = await provider.sendEmail({
        to: job.recipient_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: job.dedupe_key,
      });

      if (sendResult.success) {
        await supabase
          .from("appointment_reminders")
          .update({
            status: "sent",
            provider_message_id: sendResult.messageId || null,
            sent_at: new Date().toISOString(),
            last_error_code: null,
            last_error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.succeeded += 1;
      } else {
        const canRetry = job.attempt_count < job.max_attempts;
        const backoffSeconds = calculateBackoffSeconds(job.attempt_count);
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

        await supabase
          .from("appointment_reminders")
          .update({
            status: canRetry ? "retry_pending" : "failed",
            next_attempt_at: nextAttemptAt,
            last_error_code: sendResult.errorCode || "SEND_FAILED",
            last_error_message: sendResult.errorMessage || "Delivery provider failed to send reminder",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        if (canRetry) {
          outcome.retried += 1;
        } else {
          outcome.failed += 1;
        }

        outcome.errors.push({
          id: job.id,
          error: sendResult.errorMessage || "Delivery failed",
        });
      }
    } catch (jobErr) {
      const errMsg = jobErr instanceof Error ? jobErr.message : "Unexpected job execution error";
      console.error(`[ReminderWorker] Error processing job ${job.id}:`, jobErr);

      const canRetry = job.attempt_count < job.max_attempts;
      const backoffSeconds = calculateBackoffSeconds(job.attempt_count);
      const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

      try {
        await supabase
          .from("appointment_reminders")
          .update({
            status: canRetry ? "retry_pending" : "failed",
            next_attempt_at: nextAttemptAt,
            last_error_code: "EXCEPTION",
            last_error_message: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      } catch {
        // Suppress secondary update failure
      }

      if (canRetry) {
        outcome.retried += 1;
      } else {
        outcome.failed += 1;
      }

      outcome.errors.push({ id: job.id, error: errMsg });
    }
  }

  return outcome;
}
