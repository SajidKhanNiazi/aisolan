/**
 * BookPilot AI — Upstash QStash Asynchronous Scheduler Client
 * Provides punctual delayed message scheduling for automated appointment reminders
 * down to the second, backed by cryptographic signature verification.
 */

import { Client, Receiver } from "@upstash/qstash";

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

  // If due time is already in the past or immediately due, let standard worker handle it
  if (dueTimestampSec <= nowSec) {
    return { scheduled: false, reason: "Due time is in the past" };
  }

  try {
    const res = await client.publishJSON({
      url: targetUrl,
      body: {
        batchSize: 10,
        trigger: "qstash_reminder",
        appointmentId: options.appointmentId,
      },
      notBefore: dueTimestampSec,
      deduplicationId: options.dedupeKey,
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
