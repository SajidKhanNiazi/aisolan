/**
 * BookPilot AI — Branded Transactional Email Templates
 * Phase 1G-A: Responsive HTML & Plain-Text Generation
 * Design: BookPilot AI white/blue palette, responsive mobile-first typography,
 * correct business timezone presentation, and zero guessed management links.
 */

import type {
  NotificationTemplateKey,
  NotificationTemplatePayload,
} from "../types";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Formats price from minor currency units (e.g. 4500 GBP -> £45.00)
 */
export function formatCurrencyFromMinor(minorUnits: number, currency = "GBP"): string {
  const safeMinor = Number.isFinite(minorUnits) ? minorUnits : 0;
  const major = safeMinor / 100;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

/**
 * Formats appointment ISO timestamp into human-readable date & time in the salon's timezone.
 */
export function formatAppointmentDateTime(
  isoDateStr: string,
  timeZone = "Europe/London"
): { formattedDate: string; formattedTime: string; timeZoneLabel: string } {
  try {
    const d = new Date(isoDateStr);
    const formattedDate = d.toLocaleDateString("en-GB", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formattedTime = d.toLocaleTimeString("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return {
      formattedDate,
      formattedTime,
      timeZoneLabel: timeZone,
    };
  } catch {
    return {
      formattedDate: isoDateStr,
      formattedTime: "",
      timeZoneLabel: timeZone,
    };
  }
}

/**
 * Wraps inner content in a responsive, cross-client BookPilot AI HTML shell.
 */
function wrapHtmlShell(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .email-container {
      max-width: 600px;
      margin: 24px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0;
      color: #ffffff;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #bfdbfe;
      margin: 4px 0 0 0;
    }
    .content {
      padding: 32px 24px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 9999px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .badge-success { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-info { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-danger { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .heading {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .paragraph {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 24px 0;
    }
    .card-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-label {
      color: #64748b;
      font-weight: 500;
    }
    .detail-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .btn {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 24px;
      border-radius: 8px;
      text-align: center;
      margin-top: 8px;
    }
    .btn:hover {
      background-color: #1d4ed8;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer a {
      color: #2563eb;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="brand-title">${escapeHtml(title)}</h1>
      <p class="brand-subtitle">Powered by Bookzello</p>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px 0;">This is an automated transactional notification regarding your appointment.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Bookzello. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a complete transactional email based on template key and payload.
 */
export function renderEmailTemplate(
  templateKey: NotificationTemplateKey,
  payload: NotificationTemplatePayload,
  appUrl = "https://bookzello.com"
): RenderedEmail {
  const {
    business_name,
    business_slug,
    business_phone,
    business_email,
    business_timezone = "Europe/London",
    customer_name,
    service_name,
    staff_name,
    starts_at,
    previous_starts_at,
    duration_minutes,
    price_minor,
    currency = "GBP",
    booking_reference,
    cancellation_reason,
    management_url,
  } = payload;

  const currentDt = formatAppointmentDateTime(starts_at, business_timezone);
  const formattedPrice = formatCurrencyFromMinor(price_minor, currency);
  const cleanAppUrl = appUrl.replace(/\/+$/, "");

  // Safe CTA button: Only render if valid management_url is present
  const hasManagementUrl = Boolean(management_url && management_url.trim().length > 0);
  const ctaButtonHtml = hasManagementUrl
    ? `<a href="${escapeHtml(management_url!)}" class="btn" target="_blank" rel="noopener noreferrer">Manage or Reschedule Booking &rarr;</a>`
    : `<p style="font-size: 13px; color: #64748b; margin-top: 16px; text-align: center;">
         Need to make changes? Contact ${escapeHtml(business_name)} directly at ${escapeHtml(
        business_phone || business_email || "the salon"
      )}.
       </p>`;

  switch (templateKey) {
    // -------------------------------------------------------------------------
    // 1. Customer Booking Confirmation
    // -------------------------------------------------------------------------
    case "customer_booking_confirmation": {
      const subject = `Booking Confirmed — ${business_name} (${booking_reference})`;

      const bodyHtml = `
        <span class="badge badge-success">&#10003; Confirmed Appointment</span>
        <h2 class="heading">Hi ${escapeHtml(customer_name)}, you're booked!</h2>
        <p class="paragraph">
          Your appointment at <strong>${escapeHtml(business_name)}</strong> has been successfully confirmed. 
          Here are your appointment details:
        </p>

        <div class="card-box">
          <div class="detail-row">
            <span class="detail-label">Booking Reference</span>
            <span class="detail-value">${escapeHtml(booking_reference)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">${escapeHtml(service_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Specialist</span>
            <span class="detail-value">${escapeHtml(staff_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${escapeHtml(currentDt.formattedDate)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">${escapeHtml(currentDt.formattedTime)} (${escapeHtml(currentDt.timeZoneLabel)})</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration</span>
            <span class="detail-value">${duration_minutes} minutes</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Price</span>
            <span class="detail-value">${escapeHtml(formattedPrice)}</span>
          </div>
        </div>

        ${ctaButtonHtml}
      `;

      const text = `
BOOKING CONFIRMED — ${business_name.toUpperCase()}
Reference: ${booking_reference}

Hi ${customer_name},

Your appointment at ${business_name} has been confirmed.

APPOINTMENT DETAILS:
- Service: ${service_name}
- Specialist: ${staff_name}
- Date: ${currentDt.formattedDate}
- Time: ${currentDt.formattedTime} (${currentDt.timeZoneLabel})
- Duration: ${duration_minutes} mins
- Total: ${formattedPrice}

${
  hasManagementUrl
    ? `MANAGE YOUR BOOKING:\n${management_url}\n`
    : `Need to reschedule or cancel? Contact ${business_name} directly at ${business_phone || business_email || "the salon"}.\n`
}
Thank you for booking with ${business_name}.
Powered by Bookzello
      `.trim();

      return {
        subject,
        html: wrapHtmlShell(business_name, bodyHtml),
        text,
      };
    }

    // -------------------------------------------------------------------------
    // 2. Customer Rescheduling Confirmation
    // -------------------------------------------------------------------------
    case "customer_rescheduling_confirmation": {
      const subject = `Appointment Updated — ${business_name} (${booking_reference})`;
      const prevDt = previous_starts_at
        ? formatAppointmentDateTime(previous_starts_at, business_timezone)
        : null;

      const bodyHtml = `
        <span class="badge badge-info">&#8635; Rescheduled</span>
        <h2 class="heading">Your appointment has been updated</h2>
        <p class="paragraph">
          Hi ${escapeHtml(customer_name)}, your appointment at <strong>${escapeHtml(
        business_name
      )}</strong> has been rescheduled to a new time.
        </p>

        <div class="card-box">
          <div class="detail-row">
            <span class="detail-label">Booking Reference</span>
            <span class="detail-value">${escapeHtml(booking_reference)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">${escapeHtml(service_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Specialist</span>
            <span class="detail-value">${escapeHtml(staff_name)}</span>
          </div>
          ${
            prevDt
              ? `<div class="detail-row" style="opacity: 0.7;">
                   <span class="detail-label">Previous Slot</span>
                   <span class="detail-value" style="text-decoration: line-through;">${escapeHtml(
                     prevDt.formattedDate
                   )} at ${escapeHtml(prevDt.formattedTime)}</span>
                 </div>`
              : ""
          }
          <div class="detail-row" style="background-color: #eff6ff; margin: 4px -8px; padding: 8px; border-radius: 6px;">
            <span class="detail-label" style="color: #1d4ed8; font-weight: 700;">New Time</span>
            <span class="detail-value" style="color: #1d4ed8; font-weight: 700;">${escapeHtml(
              currentDt.formattedDate
            )} at ${escapeHtml(currentDt.formattedTime)} (${escapeHtml(currentDt.timeZoneLabel)})</span>
          </div>
        </div>

        ${ctaButtonHtml}
      `;

      const text = `
APPOINTMENT UPDATED — ${business_name.toUpperCase()}
Reference: ${booking_reference}

Hi ${customer_name},

Your appointment at ${business_name} has been rescheduled.

NEW DETAILS:
- Service: ${service_name}
- Specialist: ${staff_name}
${prevDt ? `- Previous Slot: ${prevDt.formattedDate} at ${prevDt.formattedTime}\n` : ""}- New Slot: ${currentDt.formattedDate} at ${currentDt.formattedTime} (${currentDt.timeZoneLabel})

${
  hasManagementUrl
    ? `MANAGE YOUR BOOKING:\n${management_url}\n`
    : `Need further changes? Contact ${business_name} at ${business_phone || business_email || "the salon"}.\n`
}
Powered by Bookzello
      `.trim();

      return {
        subject,
        html: wrapHtmlShell(business_name, bodyHtml),
        text,
      };
    }

    // -------------------------------------------------------------------------
    // 3. Customer Cancellation Confirmation
    // -------------------------------------------------------------------------
    case "customer_cancellation_confirmation": {
      const subject = `Appointment Cancelled — ${business_name} (${booking_reference})`;

      const bodyHtml = `
        <span class="badge badge-danger">&#10005; Cancelled</span>
        <h2 class="heading">Appointment Cancelled</h2>
        <p class="paragraph">
          Hi ${escapeHtml(customer_name)}, your appointment with reference <strong>${escapeHtml(
        booking_reference
      )}</strong> has been cancelled.
        </p>

        <div class="card-box">
          <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">${escapeHtml(service_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Specialist</span>
            <span class="detail-value">${escapeHtml(staff_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Cancelled Slot</span>
            <span class="detail-value">${escapeHtml(currentDt.formattedDate)} at ${escapeHtml(
        currentDt.formattedTime
      )}</span>
          </div>
          ${
            cancellation_reason
              ? `<div class="detail-row">
                   <span class="detail-label">Reason</span>
                   <span class="detail-value">${escapeHtml(cancellation_reason)}</span>
                 </div>`
              : ""
          }
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-top: 16px;">
          This timeslot has been released. If you would like to book a new appointment in the future, you are welcome to visit our booking page at any time.
        </p>

        <a href="${cleanAppUrl}/booking/${business_slug}" class="btn" target="_blank" rel="noopener noreferrer">
          Book a New Appointment &rarr;
        </a>
      `;

      const text = `
APPOINTMENT CANCELLED — ${business_name.toUpperCase()}
Reference: ${booking_reference}

Hi ${customer_name},

Your appointment for ${service_name} on ${currentDt.formattedDate} at ${currentDt.formattedTime} has been cancelled.
${cancellation_reason ? `Reason: ${cancellation_reason}\n` : ""}
Your reserved slot has been released. If you wish to rebook, please visit:
${cleanAppUrl}/booking/${business_slug}

Powered by Bookzello
      `.trim();

      return {
        subject,
        html: wrapHtmlShell(business_name, bodyHtml),
        text,
      };
    }

    // -------------------------------------------------------------------------
    // 4. Owner New Booking Alert
    // -------------------------------------------------------------------------
    case "owner_new_booking_alert": {
      const subject = `[New Booking] ${customer_name} — ${service_name} (${booking_reference})`;
      const dashboardUrl = `${cleanAppUrl}/dashboard/${business_slug}/appointments`;

      const bodyHtml = `
        <span class="badge badge-success">New Booking Received</span>
        <h2 class="heading">New Appointment Booked</h2>
        <p class="paragraph">
          A new appointment has been scheduled at <strong>${escapeHtml(business_name)}</strong>:
        </p>

        <div class="card-box">
          <div class="detail-row">
            <span class="detail-label">Customer</span>
            <span class="detail-value">${escapeHtml(customer_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">${escapeHtml(service_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Assigned Specialist</span>
            <span class="detail-value">${escapeHtml(staff_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date & Time</span>
            <span class="detail-value">${escapeHtml(currentDt.formattedDate)} at ${escapeHtml(
        currentDt.formattedTime
      )} (${escapeHtml(currentDt.timeZoneLabel)})</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Price</span>
            <span class="detail-value">${escapeHtml(formattedPrice)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Reference</span>
            <span class="detail-value">${escapeHtml(booking_reference)}</span>
          </div>
        </div>

        <a href="${escapeHtml(dashboardUrl)}" class="btn" target="_blank" rel="noopener noreferrer">
          View in Owner Dashboard &rarr;
        </a>
      `;

      const text = `
NEW BOOKING ALERT — ${business_name}
Customer: ${customer_name}
Service: ${service_name}
Specialist: ${staff_name}
Date/Time: ${currentDt.formattedDate} at ${currentDt.formattedTime} (${currentDt.timeZoneLabel})
Reference: ${booking_reference}
Price: ${formattedPrice}

View appointment in dashboard:
${dashboardUrl}

Powered by Bookzello
      `.trim();

      return {
        subject,
        html: wrapHtmlShell(`${business_name} Dashboard`, bodyHtml),
        text,
      };
    }

    // -------------------------------------------------------------------------
    // 5. Owner Reschedule Alert
    // -------------------------------------------------------------------------
    case "owner_reschedule_alert": {
      const subject = `[Rescheduled] ${customer_name} — ${service_name} (${booking_reference})`;
      const dashboardUrl = `${cleanAppUrl}/dashboard/${business_slug}/appointments`;
      const prevDt = previous_starts_at
        ? formatAppointmentDateTime(previous_starts_at, business_timezone)
        : null;

      const bodyHtml = `
        <span class="badge badge-info">Appointment Rescheduled</span>
        <h2 class="heading">Appointment Moved to New Time</h2>
        <p class="paragraph">
          An appointment for <strong>${escapeHtml(customer_name)}</strong> has been rescheduled:
        </p>

        <div class="card-box">
          <div class="detail-row">
            <span class="detail-label">Customer</span>
            <span class="detail-value">${escapeHtml(customer_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">${escapeHtml(service_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Specialist</span>
            <span class="detail-value">${escapeHtml(staff_name)}</span>
          </div>
          ${
            prevDt
              ? `<div class="detail-row" style="opacity: 0.7;">
                   <span class="detail-label">Previous Slot</span>
                   <span class="detail-value" style="text-decoration: line-through;">${escapeHtml(
                     prevDt.formattedDate
                   )} at ${escapeHtml(prevDt.formattedTime)}</span>
                 </div>`
              : ""
          }
          <div class="detail-row" style="background-color: #eff6ff; margin: 4px -8px; padding: 8px; border-radius: 6px;">
            <span class="detail-label" style="color: #1d4ed8; font-weight: 700;">New Slot</span>
            <span class="detail-value" style="color: #1d4ed8; font-weight: 700;">${escapeHtml(
              currentDt.formattedDate
            )} at ${escapeHtml(currentDt.formattedTime)} (${escapeHtml(currentDt.timeZoneLabel)})</span>
          </div>
        </div>

        <a href="${escapeHtml(dashboardUrl)}" class="btn" target="_blank" rel="noopener noreferrer">
          View in Owner Dashboard &rarr;
        </a>
      `;

      const text = `
RESCHEDULE ALERT — ${business_name}
Customer: ${customer_name}
Service: ${service_name}
Specialist: ${staff_name}
${prevDt ? `Previous Slot: ${prevDt.formattedDate} at ${prevDt.formattedTime}\n` : ""}New Slot: ${currentDt.formattedDate} at ${currentDt.formattedTime} (${currentDt.timeZoneLabel})
Reference: ${booking_reference}

View appointment in dashboard:
${dashboardUrl}

Powered by Bookzello
      `.trim();

      return {
        subject,
        html: wrapHtmlShell(`${business_name} Dashboard`, bodyHtml),
        text,
      };
    }

    // -------------------------------------------------------------------------
    // 6. Owner Cancellation Alert
    // -------------------------------------------------------------------------
    case "owner_cancellation_alert": {
      const subject = `[Cancelled] ${customer_name} — ${service_name} (${booking_reference})`;
      const dashboardUrl = `${cleanAppUrl}/dashboard/${business_slug}/appointments`;

      const bodyHtml = `
        <span class="badge badge-danger">Appointment Cancelled</span>
        <h2 class="heading">Appointment Cancelled</h2>
        <p class="paragraph">
          An appointment for <strong>${escapeHtml(customer_name)}</strong> has been cancelled and the slot has been released:
        </p>

        <div class="card-box">
          <div class="detail-row">
            <span class="detail-label">Customer</span>
            <span class="detail-value">${escapeHtml(customer_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">${escapeHtml(service_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Specialist</span>
            <span class="detail-value">${escapeHtml(staff_name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Cancelled Slot</span>
            <span class="detail-value">${escapeHtml(currentDt.formattedDate)} at ${escapeHtml(
        currentDt.formattedTime
      )}</span>
          </div>
          ${
            cancellation_reason
              ? `<div class="detail-row">
                   <span class="detail-label">Reason</span>
                   <span class="detail-value">${escapeHtml(cancellation_reason)}</span>
                 </div>`
              : ""
          }
        </div>

        <a href="${escapeHtml(dashboardUrl)}" class="btn" target="_blank" rel="noopener noreferrer">
          View in Owner Dashboard &rarr;
        </a>
      `;

      const text = `
CANCELLATION ALERT — ${business_name}
Customer: ${customer_name}
Service: ${service_name}
Specialist: ${staff_name}
Slot: ${currentDt.formattedDate} at ${currentDt.formattedTime}
Reference: ${booking_reference}
${cancellation_reason ? `Reason: ${cancellation_reason}\n` : ""}
View in dashboard:
${dashboardUrl}

Powered by Bookzello
      `.trim();

      return {
        subject,
        html: wrapHtmlShell(`${business_name} Dashboard`, bodyHtml),
        text,
      };
    }
  }
}
