import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { ResendDeliveryProvider } from "@/features/notifications/provider";
import { renderEmailTemplate } from "@/features/notifications/templates";
import { scheduleAppointmentReminderQStash, getQStashReceiver } from "@/lib/qstash";
import type { NotificationTemplatePayload } from "@/features/notifications/types";

/**
 * STRICT ISOLATION CONSTANTS
 * Hardcoded allowlist. Rejects any other salon, customer, or recipient.
 */
const ALLOWED_SALON_ID = "0c60d233-a86f-499d-9846-4cd3daf8ca1a"; // BookPilot QA Salon
const ALLOWED_CUSTOMER_ID = "fd8f4ded-bd61-4424-b564-9ac7c4f79296"; // QA Web Booker
const ALLOWED_RECIPIENT_EMAIL = "sajikhan8802@gmail.com"; // ONLY authorized test inbox

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-test-auth-token");
    if (!authHeader || authHeader.trim().length < 32) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing or invalid test authentication token." },
        { status: 401 }
      );
    }

    const rawToken = authHeader.trim();
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    let body: { appointmentId?: string; reminderId?: string; businessId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Bad Request: Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { appointmentId, reminderId, businessId } = body;
    if (!appointmentId || !reminderId || !businessId) {
      return NextResponse.json(
        { success: false, error: "Bad Request: appointmentId, reminderId, and businessId are required." },
        { status: 400 }
      );
    }

    // Barrier 1: Restrict to BookPilot QA Salon only
    if (businessId !== ALLOWED_SALON_ID) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Execution restricted to BookPilot QA Salon." },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable." },
        { status: 500 }
      );
    }

    // Barrier 2: Authenticate and single-use invalidate test token via appointment_management_tokens
    const nowIso = new Date().toISOString();
    const { data: tokenRecord, error: tokenErr } = await supabase
      .from("appointment_management_tokens")
      .select("id, appointment_id, business_id, is_revoked, expires_at")
      .eq("appointment_id", appointmentId)
      .eq("business_id", ALLOWED_SALON_ID)
      .eq("token_hash", tokenHash)
      .eq("is_revoked", false)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (tokenErr || !tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Single-use execution token is invalid, expired, or already used." },
        { status: 401 }
      );
    }

    // Immediately revoke the single-use token before performing any business action
    await supabase
      .from("appointment_management_tokens")
      .update({ is_revoked: true, revoked_at: nowIso })
      .eq("id", tokenRecord.id);

    // Barrier 3: Atomic single-job claim with exact allowlist constraints
    const leaseDurationSec = 300;
    const leaseExpiresIso = new Date(Date.now() + leaseDurationSec * 1000).toISOString();

    const { data: claimedRows, error: claimErr } = await supabase
      .from("appointment_reminders")
      .update({
        status: "processing",
        claimed_at: nowIso,
        lease_expires_at: leaseExpiresIso,
        attempt_count: 1,
        updated_at: nowIso,
      })
      .eq("id", reminderId)
      .eq("appointment_id", appointmentId)
      .eq("business_id", ALLOWED_SALON_ID)
      .eq("customer_id", ALLOWED_CUSTOMER_ID)
      .eq("status", "pending")
      .select("*, customer:customers(*), business:businesses(*), appointment:appointments(*)");

    if (claimErr || !claimedRows || claimedRows.length !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict: Reminder job is not in pending state or was already claimed by another process.",
          claimError: claimErr?.message,
        },
        { status: 409 }
      );
    }

    const job = claimedRows[0];

    // Barrier 4: Validate recipient email strictly matches allowlist
    const recipientEmail = job.customer?.email?.toLowerCase().trim();
    if (recipientEmail !== ALLOWED_RECIPIENT_EMAIL) {
      await supabase
        .from("appointment_reminders")
        .update({
          status: "failed",
          last_error_code: "SECURITY_VIOLATION",
          last_error_message: `Recipient '${recipientEmail}' does not match allowlist.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reminderId);

      return NextResponse.json(
        { success: false, error: "Security Violation: Customer email does not match authorized test recipient." },
        { status: 403 }
      );
    }

    // Step 5: Test real QStash delayed message scheduling
    let qstashScheduled = false;
    let qstashMessageId: string | null = null;
    let qstashReason: string | null = null;

    try {
      const qstashRes = await scheduleAppointmentReminderQStash({
        appointmentId: job.appointment_id,
        dedupeKey: job.dedupe_key,
        dueAtUtc: job.due_at,
      });
      qstashScheduled = qstashRes.scheduled;
      qstashMessageId = qstashRes.messageId || null;
      qstashReason = qstashRes.reason || null;
    } catch (qErr: unknown) {
      qstashReason = qErr instanceof Error ? qErr.message : String(qErr);
    }

    // Step 6: Render localized reminder email template
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com").replace(/\/+$/, "");
    const templatePayload: NotificationTemplatePayload = {
      business_name: job.business.name,
      business_slug: job.business.slug,
      business_phone: job.business.phone || "+44 20 7946 0000",
      business_email: job.business.email || "bookings@bookzello.com",
      business_timezone: job.appointment.timezone_snapshot || "Europe/London",
      business_address: "1 Test Street, London",
      customer_name: job.customer.name,
      customer_email: job.customer.email,
      customer_phone: job.customer.phone,
      service_name: job.appointment.service_name_snapshot,
      staff_name: "Alex QA",
      starts_at: job.appointment.starts_at,
      service_ends_at: job.appointment.service_ends_at,
      duration_minutes: job.appointment.duration_minutes_snapshot,
      price_minor: job.appointment.price_minor_snapshot,
      currency: job.appointment.currency_snapshot || "GBP",
      booking_reference: "APPT-" + job.appointment.id.replace(/-/g, "").substring(0, 8).toUpperCase(),
      management_url: `${appUrl}/booking/${job.business.slug}`,
    };

    const rendered = renderEmailTemplate("customer_appointment_reminder", templatePayload, appUrl);

    // Step 7: Send email strictly via production Resend provider
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || "Bookzello <bookings@bookzello.com>";

    if (!resendApiKey || resendApiKey.trim() === "") {
      await supabase
        .from("appointment_reminders")
        .update({
          status: "failed",
          last_error_code: "RESEND_NOT_CONFIGURED",
          last_error_message: "RESEND_API_KEY is not configured in server environment.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json(
        { success: false, error: "Server configuration error: RESEND_API_KEY is missing." },
        { status: 500 }
      );
    }

    const provider = new ResendDeliveryProvider(resendApiKey, resendFrom);
    const sendResult = await provider.sendEmail({
      to: ALLOWED_RECIPIENT_EMAIL,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: job.dedupe_key,
    });

    if (!sendResult.success) {
      await supabase
        .from("appointment_reminders")
        .update({
          status: "failed",
          last_error_code: sendResult.errorCode || "RESEND_FAILED",
          last_error_message: sendResult.errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json(
        {
          success: false,
          error: `Resend dispatch failed: [${sendResult.errorCode}] ${sendResult.errorMessage}`,
        },
        { status: 502 }
      );
    }

    // Step 8: Update reminder record to 'sent' with provider message id
    const sentAtIso = new Date().toISOString();
    await supabase
      .from("appointment_reminders")
      .update({
        status: "sent",
        provider_message_id: sendResult.messageId || null,
        sent_at: sentAtIso,
        last_error_code: null,
        last_error_message: null,
        updated_at: sentAtIso,
      })
      .eq("id", job.id);

    return NextResponse.json({
      success: true,
      appointmentId: job.appointment_id,
      reminderJobId: job.id,
      recipient: ALLOWED_RECIPIENT_EMAIL,
      appointmentStartsAt: job.appointment.starts_at,
      reminderDueAt: job.due_at,
      qstashScheduled,
      qstashMessageId,
      qstashReason,
      resendAccepted: true,
      resendMessageId: sendResult.messageId,
      sentAt: sentAtIso,
      status: "sent",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ControlledReminderTestAPI] Unexpected failure:", msg);
    return NextResponse.json(
      { success: false, error: "Internal server error during controlled test.", details: msg },
      { status: 500 }
    );
  }
}
