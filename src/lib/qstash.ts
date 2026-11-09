/**
 * BookPilot AI — Upstash QStash Asynchronous Scheduler Client
 * Provides punctual delayed message scheduling for automated appointment reminders
 * down to the second, backed by cryptographic signature verification.
 */

import { Client, Receiver } from "@upstash/qstash";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

let qstashClient: Client | null = null;
let qstashReceiver: Receiver | null = null;

export function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN;
  if (!token || token.trim() === "") {
    return null;
  }
  if (!qstashClient) {
    qstashClient = new Client({
      token: token.trim(),
      baseUrl: process.env.QSTASH_URL?.trim() || undefined,
    });
  }
  return qstashClient;
}

export function getQStashReceiver(): Receiver | null {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentKey || currentKey.trim() === "") {
    return null;
  }
  if (!qstashReceiver) {
    qstashReceiver = new Receiver({
      currentSigningKey: currentKey.trim(),
      nextSigningKey: nextKey?.trim() || currentKey.trim(),
    });
  }
  return qstashReceiver;
}

export interface ScheduleReminderOptions {
  appointmentId: string;
  dedupeKey: string;
  dueAtUtc: string; // ISO 8601 string
  appUrl?: string;
  cronSecret?: string;
}

/**
 * Schedules a delayed message via QStash to trigger reminder processing exactly when due.
 * Fallback-safe: If QStash is unconfigured, returns { scheduled: false } while preserving
 * the PostgreSQL queue as the canonical source of truth.
 */
export async function scheduleAppointmentReminderQStash(
  options: ScheduleReminderOptions
): Promise<{ scheduled: boolean; messageId?: string; reason?: string }> {
  const client = getQStashClient();
  if (!client) {
    return { scheduled: false, reason: "QSTASH_TOKEN is not configured" };
  }

  const appUrl = (options.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com").replace(/\/+$/, "");
  const cronSecret = options.cronSecret || process.env.CRON_SECRET || "";
  const targetUrl = `${appUrl}/api/internal/notifications/process`;

  const dueTimestampSec = Math.floor(new Date(options.dueAtUtc).getTime() / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  const delaySec = dueTimestampSec - nowSec;

  // If due time is already in the past or immediately due, let standard worker handle it
  if (delaySec <= 0) {
    return { scheduled: false, reason: "Due time is in the past" };
  }

  // QStash standard delayed message max horizon is 7 days (604,800 seconds).
  // Reminders beyond 7 days are safely retained in the database queue and promoted
  // into QStash when they enter the 7-day window.
  const MAX_QSTASH_DELAY_SEC = 7 * 24 * 3600;
  if (delaySec > MAX_QSTASH_DELAY_SEC) {
    return {
      scheduled: false,
      reason: "Appointment reminder is >7 days ahead; preserved in PostgreSQL queue for periodic promotion sweep",
    };
  }

  try {
    // QStash deduplicationId restricts characters to alphanumeric, hyphens, and underscores (no colons)
    const sanitizedDeduplicationId = options.dedupeKey.replace(/[^a-zA-Z0-9_-]/g, "-");

    const res = await client.publishJSON({
      url: targetUrl,
      body: {
        batchSize: 10,
        trigger: "qstash_reminder",
        appointmentId: options.appointmentId,
      },
      notBefore: dueTimestampSec,
      deduplicationId: sanitizedDeduplicationId,
      retries: 3,
      headers: cronSecret
        ? {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          }
        : {
            "Content-Type": "application/json",
          },
    });

    const messageId = "messageId" in res ? (res.messageId as string) : undefined;
    return { scheduled: true, messageId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[QStash] Failed to schedule reminder for appointment ${options.appointmentId}:`, errorMsg);
    return { scheduled: false, reason: errorMsg };
  }
}

/**
 * Checks if a pending reminder was created in PostgreSQL for the given appointment,
 * and if so, publishes a delayed trigger to QStash.
 */
export async function dispatchReminderToQStashIfPending(
  appointmentId: string
): Promise<{ scheduled: boolean; messageId?: string; reason?: string }> {
  try {
    const serviceClient = createServiceClient();
    const supabase = serviceClient || (await createClient());
    if (!supabase) {
      return { scheduled: false, reason: "Database client unavailable" };
    }

    const { data: reminder, error } = await supabase
      .from("appointment_reminders")
      .select("id, dedupe_key, due_at")
      .eq("appointment_id", appointmentId)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !reminder) {
      return { scheduled: false, reason: error?.message || "No pending reminder found" };
    }

    return await scheduleAppointmentReminderQStash({
      appointmentId,
      dedupeKey: reminder.dedupe_key,
      dueAtUtc: reminder.due_at,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[QStash] dispatchReminderToQStashIfPending notice for ${appointmentId}:`, msg);
    return { scheduled: false, reason: msg };
  }
}

export interface PromotionSweepOutcome {
  examined: number;
  promoted: number;
  skipped: number;
  failed: number;
}

/**
 * Sweeps the PostgreSQL queue for pending reminders due within the 7-day QStash window
 * and publishes delayed messages for any that have not yet been scheduled into QStash.
 * Idempotent via unique deduplicationId.
 */
export async function promotePendingRemindersToQStash(
  options: { batchSize?: number; lookaheadDays?: number } = {}
): Promise<PromotionSweepOutcome> {
  const batchSize = Math.max(1, Math.min(options.batchSize || 25, 100));
  const lookaheadDays = options.lookaheadDays || 7;
  const outcome: PromotionSweepOutcome = {
    examined: 0,
    promoted: 0,
    skipped: 0,
    failed: 0,
  };

  const client = getQStashClient();
  if (!client) {
    return outcome;
  }

  try {
    const serviceClient = createServiceClient();
    const supabase = serviceClient || (await createClient());
    if (!supabase) return outcome;

    const now = new Date();
    const horizon = new Date(now.getTime() + lookaheadDays * 24 * 3600 * 1000);

    const { data: dueSoonReminders, error } = await supabase
      .from("appointment_reminders")
      .select("id, appointment_id, due_at, dedupe_key, status")
      .eq("status", "pending")
      .gt("due_at", now.toISOString())
      .lte("due_at", horizon.toISOString())
      .order("due_at", { ascending: true })
      .limit(batchSize);

    if (error || !dueSoonReminders || dueSoonReminders.length === 0) {
      return outcome;
    }

    outcome.examined = dueSoonReminders.length;

    for (const r of dueSoonReminders) {
      const res = await scheduleAppointmentReminderQStash({
        appointmentId: r.appointment_id,
        dedupeKey: r.dedupe_key,
        dueAtUtc: r.due_at,
      });

      if (res.scheduled) {
        outcome.promoted++;
      } else {
        outcome.failed++;
      }
    }

    return outcome;
  } catch (err: unknown) {
    console.warn("[QStash] promotePendingRemindersToQStash error:", err);
    return outcome;
  }
}
