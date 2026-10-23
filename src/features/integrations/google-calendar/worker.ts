/**
 * BookPilot AI — Google Calendar Queue Worker
 * Phase 1G-B: Concurrency-Guarded Queue Processing, Token Refresh, and Idempotent Sync
 */

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "./encryption";
import { refreshAccessToken } from "./oauth";
import {
  buildGoogleEventInput,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "./client";
import type {
  CalendarSyncOutboxItem,
  ProcessSyncBatchOutcome,
} from "./types";

export interface SyncWorkerOptions {
  batchSize?: number;
  leaseSeconds?: number;
}

/**
 * Calculates exponential backoff delay in seconds for Google API retries.
 * 30s, 60s, 120s, 240s, 480s ... capped at 3600s.
 */
export function calculateSyncBackoffSeconds(attemptCount: number): number {
  const safeAttempt = Math.max(1, attemptCount);
  const factor = Math.pow(2, safeAttempt - 1);
  return Math.min(3600, factor * 30);
}

/**
 * Safely compares two database-controlled sync version strings.
 * Monotonic integer sequence numbers are compared using BigInt.
 * Falls back to lexicographical comparison if either version is non-numeric.
 * Returns true if v1 is strictly newer (greater) than v2.
 */
export function isSyncVersionNewer(v1: string, v2: string): boolean {
  if (!v1 || !v2) return false;
  try {
    const b1 = BigInt(v1);
    const b2 = BigInt(v2);
    return b1 > b2;
  } catch {
    return v1.localeCompare(v2) > 0;
  }
}

/**
 * Processes a single batch of due Google Calendar synchronization jobs.
 * Guaranteed atomic and concurrency-safe via PostgreSQL FOR UPDATE SKIP LOCKED.
 */
export async function processCalendarSyncBatch(
  options: SyncWorkerOptions = {}
): Promise<ProcessSyncBatchOutcome> {
  const batchSize = Math.max(1, Math.min(options.batchSize || 10, 50));
  const leaseSeconds = options.leaseSeconds || 300;

  const outcome: ProcessSyncBatchOutcome = {
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
    console.error("[CalendarWorker] Supabase client unavailable.");
    outcome.errors.push({ id: "client_init", error: "Database client unavailable" });
    return outcome;
  }

  // 1. Atomically claim batch of due sync jobs
  const { data: claimedJobs, error: claimError } = await supabase.rpc(
    "claim_due_calendar_sync_jobs_atomic",
    {
      p_batch_size: batchSize,
      p_lease_seconds: leaseSeconds,
    }
  );

  if (claimError) {
    console.error("[CalendarWorker] Claim RPC error:", claimError);
    outcome.errors.push({ id: "claim_rpc", error: claimError.message });
    return outcome;
  }

  if (!claimedJobs || !Array.isArray(claimedJobs) || claimedJobs.length === 0) {
    return outcome;
  }

  const jobs = claimedJobs as CalendarSyncOutboxItem[];
  outcome.processed = jobs.length;

  for (const job of jobs) {
    try {
      // 2. Fetch the business calendar connection
      const { data: connection, error: connError } = await supabase
        .from("business_calendar_connections")
        .select("*")
        .eq("business_id", job.business_id)
        .maybeSingle();

      if (connError || !connection) {
        // No connection configured -> Skip
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "skipped",
            last_error_code: "NO_CONNECTION",
            last_error_message: "Google Calendar connection is not configured for this business.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped++;
        continue;
      }

      if (connection.status !== "active" || !connection.sync_enabled) {
        // Connection disabled or requires reconnect -> Skip
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "skipped",
            last_error_code: connection.status === "needs_reconnect" ? "NEEDS_RECONNECT" : "SYNC_DISABLED",
            last_error_message: "Google Calendar synchronization is currently disabled or authorization expired.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped++;
        continue;
      }

      const destinationCalendarId = connection.google_calendar_id || "primary";

      // 3. Decrypt refresh token
      let refreshToken: string;
      try {
        refreshToken = decryptToken(connection.encrypted_refresh_token);
      } catch (decErr: unknown) {
        const dErr = decErr as Error;
        console.error(`[CalendarWorker] Token decryption failed for connection ${connection.id}:`, dErr.message);

        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "failed",
            last_error_code: "DECRYPTION_FAILED",
            last_error_message: "Failed to decrypt Google OAuth refresh token.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.failed++;
        outcome.errors.push({ id: job.id, error: "Token decryption failed", code: "DECRYPTION_FAILED" });
        continue;
      }

      // 4. Retrieve fresh access token from Google
      const tokenRefreshResult = await refreshAccessToken(refreshToken);

      if (!tokenRefreshResult.success || !tokenRefreshResult.accessToken) {
        if (tokenRefreshResult.isRevoked) {
          // Token permanently revoked by user -> Mark connection as needs_reconnect
          await supabase
            .from("business_calendar_connections")
            .update({
              status: "needs_reconnect",
              last_error_code: "AUTH_REVOKED",
              last_error_message: "Google Calendar authorization was revoked or expired. Please reconnect.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          await supabase
            .from("calendar_sync_outbox")
            .update({
              status: "failed",
              last_error_code: "AUTH_REVOKED",
              last_error_message: "Google Calendar authorization was revoked.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.failed++;
          outcome.errors.push({ id: job.id, error: "Authorization revoked", code: "AUTH_REVOKED" });
          continue;
        }

        // Temporary network or Google server failure -> Retryable
        const currentAttempts = job.attempt_count;
        const maxAttempts = job.max_attempts || 5;

        if (currentAttempts < maxAttempts) {
          const backoffSecs = calculateSyncBackoffSeconds(currentAttempts);
          await supabase
            .from("calendar_sync_outbox")
            .update({
              status: "retry_pending",
              next_attempt_at: new Date(Date.now() + backoffSecs * 1000).toISOString(),
              last_error_code: "TOKEN_REFRESH_FAILED",
              last_error_message: tokenRefreshResult.error || "Failed to refresh access token",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.retried++;
        } else {
          await supabase
            .from("calendar_sync_outbox")
            .update({
              status: "failed",
              last_error_code: "MAX_ATTEMPTS_EXCEEDED",
              last_error_message: "Failed to refresh access token after maximum retry attempts.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.failed++;
        }

        outcome.errors.push({ id: job.id, error: tokenRefreshResult.error || "Token refresh failed" });
        continue;
      }

      const accessToken = tokenRefreshResult.accessToken;
      const deterministicGoogleEventId = "bp" + job.appointment_id.replace(/-/g, "").toLowerCase();
      const eventInput = buildGoogleEventInput(job.payload);
      eventInput.id = deterministicGoogleEventId;

      // 5. Look up existing event mapping in appointment_calendar_events
      const { data: existingMapping } = await supabase
        .from("appointment_calendar_events")
        .select("*")
        .eq("business_id", job.business_id)
        .eq("appointment_id", job.appointment_id)
        .maybeSingle();

      // Stale job check: If a newer appointment version was already synchronized, skip this older job
      if (existingMapping && isSyncVersionNewer(existingMapping.last_synchronized_version, job.source_version)) {
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "skipped",
            last_error_code: "STALE_VERSION",
            last_error_message: `Superseded by synchronized version ${existingMapping.last_synchronized_version}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped++;
        continue;
      }

      // 5b. Authoritative appointment state reconciliation:
      // Protects against out-of-order commits and concurrent worker races.
      const { data: latestAppt } = await supabase
        .from("appointments")
        .select("id, business_id, status, starts_at, service_ends_at, staff_id, updated_at")
        .eq("id", job.appointment_id)
        .maybeSingle();

      const isCancelled =
        !latestAppt ||
        latestAppt.status === "cancelled" ||
        existingMapping?.status === "deleted";

      // If appointment was cancelled or deleted in database, bypass create/update and execute deletion immediately
      if (isCancelled && (job.action === "create" || job.action === "update")) {
        const targetEventId = existingMapping?.google_event_id || deterministicGoogleEventId;
        const delRes = await deleteGoogleCalendarEvent(accessToken, destinationCalendarId, targetEventId);

        if (!delRes.success && !delRes.isNotFound) {
          const compDedupeKey = `${job.appointment_id}:delete:compensate:${Date.now()}`;
          const { error: compInsertErr } = await supabase.from("calendar_sync_outbox").insert({
            business_id: job.business_id,
            appointment_id: job.appointment_id,
            action: "delete",
            connection_id: connection.id,
            source_version: job.source_version,
            payload: job.payload,
            dedupe_key: compDedupeKey,
          });

          if (compInsertErr) {
            console.error(
              `[CalendarWorker] Critical: Google deletion failed (${delRes.error}) and compensating delete enqueue failed (${compInsertErr.message}) for appt ${job.appointment_id}`
            );
            throw new Error(
              `Failed to delete Google event (${delRes.error}) and failed to persist compensating delete job (${compInsertErr.message})`
            );
          }
        }

        await supabase.from("appointment_calendar_events").upsert(
          {
            business_id: job.business_id,
            appointment_id: job.appointment_id,
            connection_id: connection.id,
            google_event_id: targetEventId,
            google_calendar_id: destinationCalendarId,
            last_synchronized_version: job.source_version,
            status: "deleted",
            last_synced_at: new Date().toISOString(),
            last_error: delRes.success || delRes.isNotFound ? null : `Immediate delete failed: ${delRes.error}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id,appointment_id" }
        );

        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "skipped",
            last_error_code: "CANCELLED_IN_FLIGHT",
            last_error_message: "Appointment was cancelled while sync operation was in flight; compensating deletion handled.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped++;
        continue;
      }

      // Authoritative slot reconciliation:
      // If the appointment's starts_at or service_ends_at in database no longer matches this job's payload,
      // a newer reschedule has already committed. Skip this stale payload to prevent overwriting newer appointments.
      if (
        latestAppt &&
        (job.action === "create" || job.action === "update") &&
        (job.payload.starts_at !== latestAppt.starts_at || job.payload.service_ends_at !== latestAppt.service_ends_at)
      ) {
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "skipped",
            last_error_code: "SUPERSEDED_BY_AUTHORITATIVE_STATE",
            last_error_message: `Appointment was rescheduled in database (current starts_at: ${latestAppt.starts_at}); skipping obsolete sync job.`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.skipped++;
        continue;
      }

      // 6. Execute action
      if (job.action === "create") {
        let googleEventId: string;

        if (existingMapping && existingMapping.status === "synced") {
          // Idempotency: Event already exists on Google Calendar, update it instead
          const updateRes = await updateGoogleCalendarEvent(
            accessToken,
            destinationCalendarId,
            existingMapping.google_event_id,
            eventInput
          );

          if (!updateRes.success) {
            throw new Error(updateRes.error || "Failed to update existing Google event");
          }
          googleEventId = existingMapping.google_event_id;
        } else {
          const createRes = await createGoogleCalendarEvent(accessToken, destinationCalendarId, eventInput);

          if (!createRes.success) {
            if (createRes.isConflict) {
              // Idempotency: Event was already created on Google Calendar (e.g. response timeout on prior attempt). Reconcile!
              const patchRes = await updateGoogleCalendarEvent(
                accessToken,
                destinationCalendarId,
                deterministicGoogleEventId,
                eventInput
              );
              if (!patchRes.success) {
                throw new Error(patchRes.error || "Failed to reconcile existing Google event");
              }
              googleEventId = deterministicGoogleEventId;
            } else {
              throw new Error(createRes.error || "Failed to create Google Calendar event");
            }
          } else if (createRes.data) {
            googleEventId = createRes.data.id;
          } else {
            googleEventId = deterministicGoogleEventId;
          }
        }

        // In-flight cancellation guard: Verify authoritative appointment status before committing
        const { data: latestAppt } = await supabase
          .from("appointments")
          .select("status")
          .eq("id", job.appointment_id)
          .maybeSingle();

        const isCancelled =
          latestAppt?.status === "cancelled" ||
          existingMapping?.status === "deleted";

        if (isCancelled) {
          const delRes = await deleteGoogleCalendarEvent(accessToken, destinationCalendarId, googleEventId);

          // Durable compensating deletion: If immediate deletion failed and not already 404, enqueue a compensating delete job
          if (!delRes.success && !delRes.isNotFound) {
            console.warn(
              `[CalendarWorker] Immediate deletion during race failed for ${job.appointment_id}: ${delRes.error}. Enqueueing durable compensating delete.`
            );
            const compDedupeKey = `${job.appointment_id}:delete:compensate:${Date.now()}`;
            const { error: compInsertErr } = await supabase.from("calendar_sync_outbox").insert({
              business_id: job.business_id,
              appointment_id: job.appointment_id,
              action: "delete",
              connection_id: connection.id,
              source_version: job.source_version,
              payload: job.payload,
              dedupe_key: compDedupeKey,
            });

            if (compInsertErr) {
              console.error(
                `[CalendarWorker] Critical: Google deletion failed (${delRes.error}) and compensating delete enqueue failed (${compInsertErr.message}) for appt ${job.appointment_id}`
              );
              throw new Error(
                `Failed to delete Google event (${delRes.error}) and failed to persist compensating delete job (${compInsertErr.message})`
              );
            }
          }

          await supabase.from("appointment_calendar_events").upsert(
            {
              business_id: job.business_id,
              appointment_id: job.appointment_id,
              connection_id: connection.id,
              google_event_id: googleEventId,
              google_calendar_id: destinationCalendarId,
              last_synchronized_version: job.source_version,
              status: "deleted",
              last_synced_at: new Date().toISOString(),
              last_error: delRes.success || delRes.isNotFound ? null : `Immediate delete failed: ${delRes.error}`,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "business_id,appointment_id" }
          );

          await supabase
            .from("calendar_sync_outbox")
            .update({
              status: "skipped",
              last_error_code: "CANCELLED_IN_FLIGHT",
              last_error_message: "Appointment was cancelled while sync operation was in flight; compensating deletion handled.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.skipped++;
          continue;
        }

        // Upsert event mapping
        await supabase.from("appointment_calendar_events").upsert(
          {
            business_id: job.business_id,
            appointment_id: job.appointment_id,
            connection_id: connection.id,
            google_event_id: googleEventId,
            google_calendar_id: destinationCalendarId,
            last_synchronized_version: job.source_version,
            status: "synced",
            last_synced_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id,appointment_id" }
        );

        // Mark outbox job completed
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "completed",
            last_error_code: null,
            last_error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.succeeded++;
      } else if (job.action === "update") {
        let googleEventId: string;

        if (!existingMapping || !existingMapping.google_event_id || existingMapping.status === "deleted") {
          // Self-healing: Event mapping did not exist (e.g. booked & rescheduled before first sync), create it anew
          const createRes = await createGoogleCalendarEvent(accessToken, destinationCalendarId, eventInput);
          if (!createRes.success) {
            if (createRes.isConflict) {
              const patchRes = await updateGoogleCalendarEvent(
                accessToken,
                destinationCalendarId,
                deterministicGoogleEventId,
                eventInput
              );
              if (!patchRes.success) {
                throw new Error(patchRes.error || "Failed to reconcile existing Google event during update");
              }
              googleEventId = deterministicGoogleEventId;
            } else {
              throw new Error(createRes.error || "Failed to create Google event during update healing");
            }
          } else if (createRes.data) {
            googleEventId = createRes.data.id;
          } else {
            googleEventId = deterministicGoogleEventId;
          }
        } else {
          googleEventId = existingMapping.google_event_id;
          const updateRes = await updateGoogleCalendarEvent(
            accessToken,
            existingMapping.google_calendar_id || destinationCalendarId,
            existingMapping.google_event_id,
            eventInput
          );

          if (!updateRes.success) {
            if (updateRes.isNotFound) {
              // Event was deleted externally on Google -> Recreate
              const recreateRes = await createGoogleCalendarEvent(accessToken, destinationCalendarId, eventInput);
              if (recreateRes.success && recreateRes.data) {
                googleEventId = recreateRes.data.id;
              } else if (recreateRes.isConflict) {
                googleEventId = deterministicGoogleEventId;
              } else {
                throw new Error(recreateRes.error || "Failed to recreate deleted Google event");
              }
            } else {
              throw new Error(updateRes.error || "Failed to update Google event");
            }
          }
        }

        // In-flight cancellation guard: Verify authoritative appointment status before committing
        const { data: latestAppt } = await supabase
          .from("appointments")
          .select("status")
          .eq("id", job.appointment_id)
          .maybeSingle();

        const isCancelled =
          latestAppt?.status === "cancelled" ||
          existingMapping?.status === "deleted";

        if (isCancelled) {
          const delRes = await deleteGoogleCalendarEvent(accessToken, destinationCalendarId, googleEventId);

          // Durable compensating deletion: If immediate deletion failed and not already 404, enqueue a compensating delete job
          if (!delRes.success && !delRes.isNotFound) {
            console.warn(
              `[CalendarWorker] Immediate deletion during race failed for ${job.appointment_id}: ${delRes.error}. Enqueueing durable compensating delete.`
            );
            const compDedupeKey = `${job.appointment_id}:delete:compensate:${Date.now()}`;
            const { error: compInsertErr } = await supabase.from("calendar_sync_outbox").insert({
              business_id: job.business_id,
              appointment_id: job.appointment_id,
              action: "delete",
              connection_id: connection.id,
              source_version: job.source_version,
              payload: job.payload,
              dedupe_key: compDedupeKey,
            });

            if (compInsertErr) {
              console.error(
                `[CalendarWorker] Critical: Google deletion failed (${delRes.error}) and compensating delete enqueue failed (${compInsertErr.message}) for appt ${job.appointment_id}`
              );
              throw new Error(
                `Failed to delete Google event (${delRes.error}) and failed to persist compensating delete job (${compInsertErr.message})`
              );
            }
          }

          await supabase.from("appointment_calendar_events").upsert(
            {
              business_id: job.business_id,
              appointment_id: job.appointment_id,
              connection_id: connection.id,
              google_event_id: googleEventId,
              google_calendar_id: destinationCalendarId,
              last_synchronized_version: job.source_version,
              status: "deleted",
              last_synced_at: new Date().toISOString(),
              last_error: delRes.success || delRes.isNotFound ? null : `Immediate delete failed: ${delRes.error}`,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "business_id,appointment_id" }
          );

          await supabase
            .from("calendar_sync_outbox")
            .update({
              status: "skipped",
              last_error_code: "CANCELLED_IN_FLIGHT",
              last_error_message: "Appointment was cancelled while sync operation was in flight; compensating deletion handled.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          outcome.skipped++;
          continue;
        }

        await supabase.from("appointment_calendar_events").upsert(
          {
            business_id: job.business_id,
            appointment_id: job.appointment_id,
            connection_id: connection.id,
            google_event_id: googleEventId,
            google_calendar_id: destinationCalendarId,
            last_synchronized_version: job.source_version,
            status: "synced",
            last_synced_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id,appointment_id" }
        );

        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "completed",
            last_error_code: null,
            last_error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.succeeded++;
      } else if (job.action === "delete") {
        const targetEventId = existingMapping?.google_event_id || deterministicGoogleEventId;
        const targetCalendarId = existingMapping?.google_calendar_id || destinationCalendarId;

        const deleteRes = await deleteGoogleCalendarEvent(
          accessToken,
          targetCalendarId,
          targetEventId
        );

        if (!deleteRes.success && !deleteRes.isNotFound) {
          throw new Error(deleteRes.error || "Failed to delete Google event");
        }

        // Durable reconciliation: update or upsert event mapping to 'deleted'
        await supabase.from("appointment_calendar_events").upsert(
          {
            business_id: job.business_id,
            appointment_id: job.appointment_id,
            connection_id: connection.id,
            google_event_id: targetEventId,
            google_calendar_id: targetCalendarId,
            last_synchronized_version: job.source_version,
            status: "deleted",
            last_synced_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id,appointment_id" }
        );

        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "completed",
            last_error_code: null,
            last_error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.succeeded++;
      }

      // Update connection's last_successful_sync_at
      await supabase
        .from("business_calendar_connections")
        .update({
          last_successful_sync_at: new Date().toISOString(),
          last_error_code: null,
          last_error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    } catch (jobErr: unknown) {
      const err = jobErr as Error;
      console.error(`[CalendarWorker] Error processing sync job ${job.id}:`, err.message);

      const currentAttempts = job.attempt_count;
      const maxAttempts = job.max_attempts || 5;

      if (currentAttempts < maxAttempts) {
        const backoffSecs = calculateSyncBackoffSeconds(currentAttempts);
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "retry_pending",
            next_attempt_at: new Date(Date.now() + backoffSecs * 1000).toISOString(),
            last_error_code: "SYNC_ERROR",
            last_error_message: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.retried++;
      } else {
        await supabase
          .from("calendar_sync_outbox")
          .update({
            status: "failed",
            last_error_code: "MAX_ATTEMPTS_EXCEEDED",
            last_error_message: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        outcome.failed++;
      }

      outcome.errors.push({ id: job.id, error: err.message, code: "SYNC_ERROR" });
    }
  }

  return outcome;
}
